using Microsoft.AspNetCore.Mvc;

using SchoolAdmissionApi.Models;

using SchoolAdmissionApi.Services;

namespace SchoolAdmissionApi.Controllers;

[ApiController]
[Route("")]
public class AdmissionController : ControllerBase
{
    private readonly IAdmissionService _admissionService;

    public AdmissionController(IAdmissionService admissionService)
    {
        _admissionService = admissionService;
    }

    private string? GetStudentId() => Request.Headers.TryGetValue("X-Student-Id", out var val) ? val.ToString().Trim() : null;

    [HttpPost("classes")]
    public async Task<IActionResult> CreateClass([FromBody] CreateClassRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ClassName) || string.IsNullOrWhiteSpace(request.Shift) || request.TotalSeats <= 0)
            return BadRequest(new { message = "Invalid class details." });

        var res = await _admissionService.CreateClassAsync(request);
        return StatusCode(201, res);
    }

    [HttpGet("classes")]
    public async Task<IActionResult> GetClasses() => Ok(await _admissionService.GetClassesAsync());

    [HttpGet("classes/{classId}")]
    public async Task<IActionResult> GetClass(string classId)
    {
        var list = await _admissionService.GetClassesAsync();
        var c = list.FirstOrDefault(x => x.Id == classId);
        if (c == null) return NotFound(new { message = "Class not found" });
        return Ok(c);
    }

    [HttpPost("classes/{classId}/holds")]
    public async Task<IActionResult> HoldSeat(string classId, [FromBody] CreateHoldRequest? req)
    {
        var studentId = GetStudentId();
        if (string.IsNullOrWhiteSpace(studentId)) return BadRequest(new { message = "X-Student-Id header required" });

        try
        {
            var studentName = req?.StudentName ?? "Student " + studentId[..Math.Min(5, studentId.Length)];
            var res = await _admissionService.CreateHoldAsync(classId, studentId, studentName);
            return StatusCode(201, res);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return StatusCode(409, new { message = ex.Message }); }
    }

    [HttpGet("holds/{holdId}")]
    public async Task<IActionResult> GetHold(string holdId)
    {
        var res = await _admissionService.GetHoldByIdAsync(holdId);
        if (res == null) return NotFound(new { message = "Hold not found" });
        return Ok(res);
    }

    [HttpPost("holds/{holdId}/confirm")]
    public async Task<IActionResult> ConfirmHold(string holdId)
    {
        var studentId = GetStudentId();
        if (string.IsNullOrWhiteSpace(studentId)) return BadRequest(new { message = "X-Student-Id required" });

        try
        {
            var res = await _admissionService.ConfirmHoldAsync(holdId, studentId);
            return Ok(res);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return StatusCode(400, new { message = ex.Message }); }
    }

    [HttpDelete("holds/{holdId}")]
    public async Task<IActionResult> CancelHold(string holdId)
    {
        var studentId = GetStudentId();
        if (string.IsNullOrWhiteSpace(studentId)) return BadRequest(new { message = "X-Student-Id required" });

        try
        {
            await _admissionService.CancelHoldAsync(holdId, studentId);
            return NoContent();
        }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("me/holds")]
    public async Task<IActionResult> GetMyHolds()
    {
        var studentId = GetStudentId();
        if (string.IsNullOrWhiteSpace(studentId)) return BadRequest(new { message = "X-Student-Id required" });
        return Ok(await _admissionService.GetStudentHoldsAsync(studentId));
    }

    [HttpGet("admin/report")]
    public async Task<IActionResult> GetAdminReport([FromQuery] string username, [FromQuery] string password)
    {
        // Hardcoded admin check
        if (username != "admin" || password != "admin123")
        {
            return StatusCode(401, new { message = "Invalid admin credentials" });
        }
        return Ok(await _admissionService.GetAdminReportAsync());
    }
}
 // controllers 