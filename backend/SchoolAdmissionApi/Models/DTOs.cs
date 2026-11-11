namespace SchoolAdmissionApi.Models;

public record CreateClassRequest(string ClassName, string Shift, int TotalSeats);

public record ClassResponse(
    string Id,
    string ClassName,
    string Shift,
    string Name,
    int TotalSeats,
    int HeldSeats,
    int ConfirmedSeats,
    int AvailableSeats
);

public record CreateHoldRequest(string StudentName);

public record HoldResponse(
    string HoldId,
    string ClassId,
    string StudentId,
    string StudentName,
    string Status,
    DateTime ExpiresAt
);

public record MyHoldResponse(
    string HoldId,
    string ClassId,
    string ClassName,
    string Shift,
    string Status,
    DateTime ExpiresAt,
    string StudentName
);

public record AdminStudentDetail(
    string StudentId,
    string StudentName,
    string Status,
    DateTime ExpiresAt,
    string HoldId
);

public record AdminClassReport(
    string ClassId,
    string ClassName,
    string Shift,
    int TotalSeats,
    int ConfirmedCount,
    int PendingCount,
    int AvailableSeats,
    List<AdminStudentDetail> Students
);
