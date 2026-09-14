using System.Diagnostics;
using System.Text.RegularExpressions;
using System.Windows.Forms;

namespace ItsAPLAN.ExplorerConnector;

internal static partial class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();

        if (args.Length != 1 || !TryReadPath(args[0], out var path))
        {
            ShowError("ItsAPLAN sent an invalid shared path.");
            return;
        }

        try
        {
            if (Directory.Exists(path))
            {
                StartExplorer(path, select: false);
                return;
            }

            if (File.Exists(path))
            {
                StartExplorer(path, select: true);
                return;
            }

            ShowError("The shared file or folder could not be found. Check your network connection and access permissions.");
        }
        catch (Exception error)
        {
            ShowError($"Windows could not open this path.\n\n{error.Message}");
        }
    }

    private static bool TryReadPath(string argument, out string path)
    {
        path = string.Empty;
        if (!Uri.TryCreate(argument, UriKind.Absolute, out var uri) ||
            uri.Scheme != "itsaplan-open" ||
            uri.Host != "open")
        {
            return false;
        }

        var query = uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries);
        var pathValue = query.FirstOrDefault(value => value.StartsWith("path=", StringComparison.Ordinal));
        if (pathValue is null) return false;

        path = Uri.UnescapeDataString(pathValue[5..]);
        if (path.IndexOfAny(['\0', '\r', '\n']) >= 0 || DevicePath().IsMatch(path)) return false;

        return UncPath().IsMatch(path) || DrivePath().IsMatch(path);
    }

    private static void StartExplorer(string path, bool select)
    {
        var start = new ProcessStartInfo("explorer.exe") { UseShellExecute = false };
        if (select) start.ArgumentList.Add("/select,");
        start.ArgumentList.Add(path);
        Process.Start(start);
    }

    private static void ShowError(string message) =>
        MessageBox.Show(message, "ItsAPLAN Explorer Connector", MessageBoxButtons.OK, MessageBoxIcon.Error);

    [GeneratedRegex(@"^\\\\[^\\/:*?""<>|]+\\[^\\/:*?""<>|]+(?:\\[^:*?""<>|]*)*$", RegexOptions.CultureInvariant)]
    private static partial Regex UncPath();

    [GeneratedRegex(@"^[A-Za-z]:\\(?:[^:*?""<>|]+\\?)*[^:*?""<>|]*$", RegexOptions.CultureInvariant)]
    private static partial Regex DrivePath();

    [GeneratedRegex(@"^\\\\[?.]\\", RegexOptions.CultureInvariant)]
    private static partial Regex DevicePath();
}
