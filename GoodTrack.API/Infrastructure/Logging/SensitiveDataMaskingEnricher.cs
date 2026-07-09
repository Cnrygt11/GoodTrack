using Serilog.Core;
using Serilog.Events;
using System;
using System.Text.RegularExpressions;

namespace GoodTrack.API.Infrastructure.Logging;

public class SensitiveDataMaskingEnricher : ILogEventEnricher
{
    private static readonly string[] SensitiveKeys = { "password", "token", "refreshtoken", "key", "secret" };
    private static readonly Regex JsonPasswordRegex = new Regex(@"""(password|token|refreshtoken|key|secret)""\s*:\s*""[^""]+""", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        foreach (var property in logEvent.Properties)
        {
            var key = property.Key.ToLower();

            // 1. Direct property name match
            if (Array.Exists(SensitiveKeys, k => key.Contains(k)))
            {
                logEvent.AddOrUpdateProperty(new LogEventProperty(property.Key, new ScalarValue("******")));
                continue;
            }

            // 2. Scan string values (e.g. JSON bodies or log messages) for JSON key-value pairs to mask
            if (property.Value is ScalarValue scalarValue && scalarValue.Value is string stringValue)
            {
                if (stringValue.Contains("password") || stringValue.Contains("token") || stringValue.Contains("secret"))
                {
                    var maskedValue = JsonPasswordRegex.Replace(stringValue, @"""$1"":""******""");
                    logEvent.AddOrUpdateProperty(new LogEventProperty(property.Key, new ScalarValue(maskedValue)));
                }
            }
        }
    }
}
