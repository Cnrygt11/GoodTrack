namespace GoodTrack.API.Models;

/// <summary>
/// Bir iş kuralının/kullanıcı hatasının ihlal edildiğini bildiren exception. Middleware bunu
/// 400 Bad Request'e çevirir ve mesajı istemciye gösterir. Servis katmanında, önceden
/// <see cref="System.InvalidOperationException"/> + "Source assembly" heuristic'iyle ayırt
/// edilen iş kuralı hataları için kullanılır; böylece gerçek iç
/// <see cref="System.InvalidOperationException"/>'lar (invariant ihlalleri) 500 olarak kalır
/// ve ham mesajları istemciye sızmaz.
/// </summary>
public class BusinessRuleException : Exception
{
    public BusinessRuleException(string message) : base(message) { }
}
