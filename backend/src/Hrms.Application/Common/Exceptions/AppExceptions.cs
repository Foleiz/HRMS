namespace Hrms.Application.Common.Exceptions;

public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
    public NotFoundException(string entityName, object key) 
        : base($"ไม่พบข้อมูล {entityName} รหัส {key} ในระบบ") { }
}

public class BusinessRuleException : Exception
{
    public BusinessRuleException(string message) : base(message) { }
}

public class ValidationException : Exception
{
    public List<string> Errors { get; }

    public ValidationException(List<string> errors) : base("ข้อมูลไม่ถูกต้องตามเงื่อนไข")
    {
        Errors = errors;
    }

    public ValidationException(string error) : this(new List<string> { error })
    {
    }
}
