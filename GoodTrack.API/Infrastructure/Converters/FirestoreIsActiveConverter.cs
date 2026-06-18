using System;
using Google.Cloud.Firestore;

namespace GoodTrack.API.Infrastructure.Converters;

public class FirestoreIsActiveConverter : IFirestoreConverter<bool>
{
    public object ToFirestore(bool value)
    {
        // Store as integer 1/0 for backward compatibility with existing DB records
        return value ? 1L : 0L;
    }

    public bool FromFirestore(object value)
    {
        if (value is bool b)
        {
            return b;
        }
        if (value is long l)
        {
            return l == 1;
        }
        if (value is int i)
        {
            return i == 1;
        }
        if (value is string s)
        {
            return s.Equals("true", StringComparison.OrdinalIgnoreCase) || s == "1";
        }
        return false;
    }
}
