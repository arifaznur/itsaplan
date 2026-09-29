import {
  cycle,
  db,
  issue,
  issueActivity,
  issueCycle,
  issueLabel,
  issueLink,
  issueStatus,
  label,
  project,
  projectColumn,
  projectMember,
  user,
} from '@repo/db';
import { eq } from 'drizzle-orm';
import { HttpError } from '#shared/lib';
import type { ProjectExport } from './export';

const STATE_TYPES = new Set(['backlog', 'unstarted', 'started', 'completed', 'canceled']);
const RELATION_KINDS = new Set(['blocks', 'relates', 'duplicates']);

export interface PortableImportResult {
  states: number;
  labels: number;
  cycles: number;
  issues: number;
  comments: number;
  relations: number;
  unmatchedAssigneeEmails: string[];
  unmatchedCommentAuthorEmails: string[];
}

function uniqueBy<T>(rows: T[], key: (row: T) => string, label: string): void {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = key(row);
    if (seen.has(value)) throw new HttpError(400, `Duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

function sequenceOf(identifier: string): number {
  const match = identifier.match(/-(\d+)$/);
  const sequence = match ? Number(match[1]) : 0;
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new HttpError(400, `Invalid issue identifier: ${identifier}`);
  }
  return sequence;
}

function isDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function importPortableProject(
  projectId: number,
  data: ProjectExport,
): Promise<PortableImportResult> {
  uniqueBy(data.states, (row) => row.name, 'state name');
  uniqueBy(data.labels, (row) => row.name, 'label name');
  uniqueBy(data.cycles, (row) => row.name, 'cycle name');
  uniqueBy(data.issues, (row) => row.identifier, 'issue identifier');
  uniqueBy(data.issues, (row) => String(sequenceOf(row.identifier)), 'issue sequence number');

  if (!data.states.length) throw new HttpError(400, 'The export has no states');
  const identifiers = new Set(data.issues.map((row) => row.identifier));
  const parentByIdentifier = new Map(
    data.issues.map((row) => [row.identifier, row.parentIdentifier]),
  );

  for (const state of data.states) {
    if (!STATE_TYPES.has(state.category)) {
      throw new HttpError(400, `Invalid state category: ${state.category}`);
    }
  }
  const cyclesByDate = [...data.cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (const [index, item] of cyclesByDate.entries()) {
    if (!isDate(item.startDate) || !isDate(item.endDate) || item.endDate < item.startDate) {
      throw new HttpError(400, `Invalid cycle dates: ${item.name}`);
    }
    const previous = cyclesByDate[index - 1];
    if (previous && item.startDate <= previous.endDate) {
      throw new HttpError(400, `Overlapping cycle: ${item.name}`);
    }
  }
  for (const item of data.issues) {
    uniqueBy(item.labels, (name) => name, `label on ${item.identifier}`);
    if (item.parentIdentifier && !identifiers.has(item.parentIdentifier)) {
      throw new HttpError(400, `Unknown parent issue: ${item.parentIdentifier}`);
    }
    if (item.parentIdentifier === item.identifier) {
      throw new HttpError(400, `An issue cannot be its own parent: ${item.identifier}`);
    }
    if (item.parentIdentifier && parentByIdentifier.get(item.parentIdentifier)) {
      throw new HttpError(400, `Subtasks cannot have subtasks: ${item.identifier}`);
    }
    if ((item.startDate && !isDate(item.startDate)) || (item.dueDate && !isDate(item.dueDate))) {
      throw new HttpError(400, `Invalid issue date: ${item.identifier}`);
    }
    for (const relation of item.relations) {
      if (!RELATION_KINDS.has(relation.kind)) {
        throw new HttpError(400, `Invalid issue relation: ${relation.kind}`);
      }
      if (!identifiers.has(relation.targetIdentifier)) {
        throw new HttpError(400, `Unknown related issue: ${relation.targetIdentifier}`);
      }
    }
    for (const comment of item.comments) {
      if (Number.isNaN(new Date(comment.createdAt).getTime())) {
        throw new HttpError(400, `Invalid comment date in ${item.identifier}`);
      }
    }
  }

  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: project.id })
      .from(project)
      .where(eq(project.id, projectId));
    if (!target) throw new HttpError(404, 'Project not found');

    const existingIssue = await tx
      .select({ id: issue.id })
      .from(issue)
      .where(eq(issue.projectId, projectId))
      .limit(1);
    const existingLabel = await tx
      .select({ id: label.id })
      .from(label)
      .where(eq(label.projectId, projectId))
      .limit(1);
    const existingCycle = await tx
      .select({ id: cycle.id })
      .from(cycle)
      .where(eq(cycle.projectId, projectId))
      .limit(1);
    if (existingIssue.length || existingLabel.length || existingCycle.length) {
      throw new HttpError(409, 'Portable JSON can only be imported into a new, empty project');
    }

    const members = await tx
      .select({ id: user.id, email: user.email })
      .from(projectMember)
      .innerJoin(user, eq(user.id, projectMember.userId))
      .where(eq(projectMember.projectId, projectId));
    const userByEmail = new Map(members.map((row) => [row.email.toLowerCase(), row.id]));

    await tx.delete(projectColumn).where(eq(projectColumn.projectId, projectId));
    const stateRows = data.states.length
      ? await tx
          .insert(projectColumn)
          .values(
            data.states.map((state, index) => ({
              projectId,
              name: state.name,
              stateType: state.category,
              position: (index + 1) * 1000,
            })),
          )
          .returning({
            id: projectColumn.id,
            name: projectColumn.name,
            stateType: projectColumn.stateType,
          })
      : [];
    const stateByName = new Map(stateRows.map((row) => [row.name, row]));

    const labelRows = data.labels.length
      ? await tx
          .insert(label)
          .values(data.labels.map((row) => ({ projectId, name: row.name, color: row.color })))
          .returning({ id: label.id, name: label.name })
      : [];
    const labelByName = new Map(labelRows.map((row) => [row.name, row.id]));

    const cycleRows = data.cycles.length
      ? await tx
          .insert(cycle)
          .values(data.cycles.map((row) => ({ projectId, ...row })))
          .returning({ id: cycle.id, name: cycle.name })
      : [];
    const cycleByName = new Map(cycleRows.map((row) => [row.name, row.id]));

    const unmatchedAssignees = new Set<string>();
    const issueByIdentifier = new Map<string, number>();
    const sequenceByIdentifier = new Map(
      data.issues.map((row) => [row.identifier, sequenceOf(row.identifier)]),
    );
    const sortedIssues = [...data.issues].sort(
      (a, b) => sequenceByIdentifier.get(a.identifier)! - sequenceByIdentifier.get(b.identifier)!,
    );

    for (const item of sortedIssues) {
      const state = stateByName.get(item.state);
      if (!state) throw new HttpError(400, `Unknown issue state: ${item.state}`);
      const cycleId = item.cycle ? cycleByName.get(item.cycle) : undefined;
      if (item.cycle && cycleId == null)
        throw new HttpError(400, `Unknown issue cycle: ${item.cycle}`);
      const email = item.assigneeEmail?.toLowerCase() ?? null;
      const assigneeUserId = email ? userByEmail.get(email) : undefined;
      if (email && assigneeUserId == null) unmatchedAssignees.add(item.assigneeEmail!);

      const [created] = await tx
        .insert(issue)
        .values({
          projectId,
          sequenceNumber: sequenceByIdentifier.get(item.identifier)!,
          columnId: state.id,
          cycleId: cycleId ?? null,
          assigneeUserId: assigneeUserId ?? null,
          title: item.title,
          description: item.description,
          priority: item.priority,
          startDate: item.startDate,
          dueDate: item.dueDate,
          position: sequenceByIdentifier.get(item.identifier)! * 1000,
        })
        .returning({ id: issue.id });
      issueByIdentifier.set(item.identifier, created!.id);
      await tx.insert(issueStatus).values({
        issueId: created!.id,
        columnId: state.id,
        columnName: state.name,
        stateType: state.stateType,
      });
      if (cycleId != null) await tx.insert(issueCycle).values({ issueId: created!.id, cycleId });

      const labelIds = item.labels.map((name) => {
        const id = labelByName.get(name);
        if (id == null) throw new HttpError(400, `Unknown issue label: ${name}`);
        return id;
      });
      if (labelIds.length) {
        await tx
          .insert(issueLabel)
          .values(labelIds.map((labelId) => ({ issueId: created!.id, labelId })));
      }
    }

    for (const item of sortedIssues) {
      if (!item.parentIdentifier) continue;
      await tx
        .update(issue)
        .set({ parentId: issueByIdentifier.get(item.parentIdentifier)! })
        .where(eq(issue.id, issueByIdentifier.get(item.identifier)!));
    }

    const unmatchedCommentAuthors = new Set<string>();
    let commentCount = 0;
    for (const item of sortedIssues) {
      const commentIds: number[] = [];
      for (const [index, comment] of item.comments.entries()) {
        if (
          comment.replyToIndex != null &&
          (comment.replyToIndex < 0 || comment.replyToIndex >= index)
        ) {
          throw new HttpError(400, `Invalid comment reply in ${item.identifier}`);
        }
        const email = comment.authorEmail?.toLowerCase() ?? null;
        const actorUserId = email ? userByEmail.get(email) : undefined;
        if (email && actorUserId == null) unmatchedCommentAuthors.add(comment.authorEmail!);
        const [created] = await tx
          .insert(issueActivity)
          .values({
            issueId: issueByIdentifier.get(item.identifier)!,
            kind: 'comment',
            replyToId: comment.replyToIndex == null ? null : commentIds[comment.replyToIndex],
            actorUserId: actorUserId ?? null,
            actorName: comment.authorName,
            body: comment.body,
            createdAt: new Date(comment.createdAt),
          })
          .returning({ id: issueActivity.id });
        commentIds.push(created!.id);
        commentCount += 1;
      }
    }

    const relationKeys = new Set<string>();
    let relationCount = 0;
    for (const item of sortedIssues) {
      for (const relation of item.relations) {
        const sourceIssueId = issueByIdentifier.get(item.identifier)!;
        const targetIssueId = issueByIdentifier.get(relation.targetIdentifier)!;
        if (sourceIssueId === targetIssueId)
          throw new HttpError(400, 'An issue cannot relate to itself');
        const key = `${Math.min(sourceIssueId, targetIssueId)}:${Math.max(sourceIssueId, targetIssueId)}:${relation.kind}`;
        if (relationKeys.has(key)) continue;
        relationKeys.add(key);
        await tx.insert(issueLink).values({ sourceIssueId, targetIssueId, kind: relation.kind });
        relationCount += 1;
      }
    }

    const maxSequence = Math.max(0, ...sequenceByIdentifier.values());
    await tx
      .update(project)
      .set({ nextSequence: maxSequence + 1 })
      .where(eq(project.id, projectId));

    return {
      states: stateRows.length,
      labels: labelRows.length,
      cycles: cycleRows.length,
      issues: issueByIdentifier.size,
      comments: commentCount,
      relations: relationCount,
      unmatchedAssigneeEmails: [...unmatchedAssignees].sort(),
      unmatchedCommentAuthorEmails: [...unmatchedCommentAuthors].sort(),
    };
  });
}
