using Microsoft.EntityFrameworkCore;
using SchoolAdmissionApi.Data;
using SchoolAdmissionApi.Models;

namespace SchoolAdmissionApi.Services;

public interface IAdmissionService
{
    Task<ClassResponse> CreateClassAsync(CreateClassRequest request);
    Task<List<ClassResponse>> GetClassesAsync();
    Task<HoldResponse> CreateHoldAsync(string classId, string studentId, string studentName);
    Task<HoldResponse?> GetHoldByIdAsync(string holdId);
    Task<ConfirmHoldResponseModel> ConfirmHoldAsync(string holdId, string studentId);
    Task<bool> CancelHoldAsync(string holdId, string studentId);
    Task<List<MyHoldResponse>> GetStudentHoldsAsync(string studentId);
    Task<List<AdminClassReport>> GetAdminReportAsync();
}

public record ConfirmHoldResponseModel(string HoldId, string Status);

public class AdmissionService : IAdmissionService
{
    private readonly AppDbContext _context;
    private readonly int _holdDurationSeconds;

    public AdmissionService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _holdDurationSeconds = int.TryParse(configuration["HOLD_DURATION_SECONDS"], out var sec) ? sec : 600;
    }

    public async Task<ClassResponse> CreateClassAsync(CreateClassRequest request)
    {
        var fullName = $"{request.ClassName} - {request.Shift}";
        var newClass = new Class
        {
            Id = "c_" + Guid.NewGuid().ToString("n")[..6],
            ClassName = request.ClassName,
            Shift = request.Shift,
            TotalSeats = request.TotalSeats
        };

        _context.Classes.Add(newClass);
        await _context.SaveChangesAsync();

        return MapToClassResponse(newClass, DateTime.UtcNow);
    }

    public async Task<List<ClassResponse>> GetClassesAsync()
    {
        var classes = await _context.Classes.Include(c => c.Holds).ToListAsync();
        var now = DateTime.UtcNow;
        return classes.Select(c => MapToClassResponse(c, now)).ToList();
    }

    public async Task<HoldResponse> CreateHoldAsync(string classId, string studentId, string studentName)
    {
        using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            var cls = await _context.Classes.Include(c => c.Holds).FirstOrDefaultAsync(c => c.Id == classId);
            if (cls == null) throw new KeyNotFoundException("Class not found");

            var now = DateTime.UtcNow;

            // Check existing active hold or confirmation in this class
            var existingActive = cls.Holds.FirstOrDefault(h =>
                h.StudentId == studentId &&
                (h.Status == "CONFIRMED" || (h.Status == "HELD" && h.ExpiresAt > now)));

            if (existingActive != null)
            {
                throw new InvalidOperationException("Student already has an active application or confirmed seat in this class.");
            }

            var heldCount = cls.Holds.Count(h => h.Status == "HELD" && h.ExpiresAt > now);
            var confirmedCount = cls.Holds.Count(h => h.Status == "CONFIRMED");
            var availableSeats = cls.TotalSeats - (heldCount + confirmedCount);

            if (availableSeats <= 0)
            {
                throw new InvalidOperationException("Seat session full! No available seats left.");
            }

            var hold = new Hold
            {
                Id = "h_" + Guid.NewGuid().ToString("n")[..6],
                ClassId = classId,
                StudentId = studentId,
                StudentName = string.IsNullOrWhiteSpace(studentName) ? "Student " + studentId[..5] : studentName,
                Status = "HELD",
                CreatedAt = now,
                ExpiresAt = now.AddSeconds(_holdDurationSeconds)
            };

            _context.Holds.Add(hold);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return new HoldResponse(hold.Id, hold.ClassId, hold.StudentId, hold.StudentName, hold.Status, hold.ExpiresAt);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<HoldResponse?> GetHoldByIdAsync(string holdId)
    {
        var h = await _context.Holds.FirstOrDefaultAsync(x => x.Id == holdId);
        if (h == null) return null;

        var now = DateTime.UtcNow;
        var status = h.Status;
        if (status == "HELD" && h.ExpiresAt <= now) status = "EXPIRED";

        return new HoldResponse(h.Id, h.ClassId, h.StudentId, h.StudentName, status, h.ExpiresAt);
    }

    public async Task<ConfirmHoldResponseModel> ConfirmHoldAsync(string holdId, string studentId)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var hold = await _context.Holds.FirstOrDefaultAsync(h => h.Id == holdId);
            if (hold == null) throw new KeyNotFoundException("Hold not found");
            if (hold.StudentId != studentId) throw new UnauthorizedAccessException("Unauthorized student.");

            var now = DateTime.UtcNow;
            if (hold.Status == "CONFIRMED") return new ConfirmHoldResponseModel(hold.Id, "CONFIRMED");

            if (hold.Status == "CANCELLED" || (hold.Status == "HELD" && hold.ExpiresAt <= now))
            {
                throw new InvalidOperationException("Hold expired or cancelled.");
            }

            hold.Status = "CONFIRMED";
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return new ConfirmHoldResponseModel(hold.Id, "CONFIRMED");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> CancelHoldAsync(string holdId, string studentId)
    {
        var hold = await _context.Holds.FirstOrDefaultAsync(h => h.Id == holdId);
        if (hold == null) return false;
        if (hold.StudentId != studentId) throw new UnauthorizedAccessException("Unauthorized.");
        if (hold.Status == "CONFIRMED") throw new InvalidOperationException("Cannot cancel confirmed admission.");

        hold.Status = "CANCELLED";
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<MyHoldResponse>> GetStudentHoldsAsync(string studentId)
    {
        var holds = await _context.Holds
            .Include(h => h.Class)
            .Where(h => h.StudentId == studentId)
            .OrderByDescending(h => h.CreatedAt)
            .ToListAsync();

        var now = DateTime.UtcNow;

        return holds.Select(h =>
        {
            var status = h.Status;
            if (status == "HELD" && h.ExpiresAt <= now) status = "EXPIRED";

            return new MyHoldResponse(
                h.Id,
                h.ClassId,
                h.Class?.ClassName ?? "Class",
                h.Class?.Shift ?? "Shift",
                status,
                h.ExpiresAt,
                h.StudentName
            );
        }).ToList();
    }

    public async Task<List<AdminClassReport>> GetAdminReportAsync()
    {
        var classes = await _context.Classes.Include(c => c.Holds).ToListAsync();
        var now = DateTime.UtcNow;
        var report = new List<AdminClassReport>();

        foreach (var c in classes)
        {
            int confirmedCount = c.Holds.Count(h => h.Status == "CONFIRMED");
            int pendingCount = c.Holds.Count(h => h.Status == "HELD" && h.ExpiresAt > now);
            int available = Math.Max(0, c.TotalSeats - (confirmedCount + pendingCount));

            var studentDetails = c.Holds.Select(h =>
            {
                var st = h.Status;
                if (st == "HELD" && h.ExpiresAt <= now) st = "EXPIRED";
                return new AdminStudentDetail(h.StudentId, h.StudentName, st, h.ExpiresAt, h.Id);
            }).ToList();

            report.Add(new AdminClassReport(
                c.Id,
                c.ClassName,
                c.Shift,
                c.TotalSeats,
                confirmedCount,
                pendingCount,
                available,
                studentDetails
            ));
        }

        return report;
    }

    private static ClassResponse MapToClassResponse(Class cls, DateTime now)
    {
        var heldCount = cls.Holds.Count(h => h.Status == "HELD" && h.ExpiresAt > now);
        var confirmedCount = cls.Holds.Count(h => h.Status == "CONFIRMED");
        var availableSeats = Math.Max(0, cls.TotalSeats - (heldCount + confirmedCount));

        return new ClassResponse(
            cls.Id,
            cls.ClassName,
            cls.Shift,
            $"{cls.ClassName} - {cls.Shift}",
            cls.TotalSeats,
            heldCount,
            confirmedCount,
            availableSeats
        );
    }
}
