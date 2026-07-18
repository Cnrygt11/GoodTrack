namespace GoodTrack.API.Constants;

/// <summary>
/// SignalR istemci metot adlarının tek kaynağı. İstemci tarafındaki karşılıkları
/// client-app-redesign/src/context/SignalRContext.tsx içindeki .on(...) kayıtlarıdır;
/// ad değişikliği iki tarafta birden yapılmalıdır.
/// </summary>
public static class SignalRMethods
{
    public const string ReceiveOrderUpdate = "ReceiveOrderUpdate";
    public const string ReceiveConnectionUpdate = "ReceiveConnectionUpdate";
    public const string ReceiveConnectionRequest = "ReceiveConnectionRequest";
}
