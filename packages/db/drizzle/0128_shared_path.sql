ALTER TABLE "custom_field" DROP CONSTRAINT "custom_field_field_type_check";
--> statement-breakpoint
ALTER TABLE "custom_field" ADD CONSTRAINT "custom_field_field_type_check" CHECK ("custom_field"."field_type" IN ('text', 'markdown', 'url', 'shared_path', 'number', 'boolean', 'date', 'datetime', 'datetime_range', 'select', 'multi_select', 'member'));
