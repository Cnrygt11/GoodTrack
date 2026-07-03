namespace GoodTrack.API.DTOs.Common;

public class ApiResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }

    public ApiResponse(bool success, string? message = null)
    {
        Success = success;
        Message = message;
    }

    public static ApiResponse Ok(string? message = null) => new(true, message);
    public static ApiResponse Fail(string? message = null) => new(false, message);
}

public class ApiResponse<T> : ApiResponse
{
    public T? Data { get; set; }

    public ApiResponse(T data, string? message = null) : base(true, message)
    {
        Data = data;
    }

    public ApiResponse(bool success, string? message = null) : base(success, message)
    {
        Data = default;
    }
}
