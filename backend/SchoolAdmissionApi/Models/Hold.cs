using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SchoolAdmissionApi.Models;

public class Hold
{
    [Key]
    public string Id { get; set; } = "h_" + Guid.NewGuid().ToString("n")[..6];

    [Required]
    public string ClassId { get; set; } = string.Empty;

    [ForeignKey(nameof(ClassId))]
    public Class? Class { get; set; }

    [Required]
    public string StudentId { get; set; } = string.Empty; // 17-digit birth id

    [Required]
    public string StudentName { get; set; } = string.Empty;

    [Required]
    public string Status { get; set; } = "HELD"; // HELD, CONFIRMED, EXPIRED, CANCELLED

    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    public DateTime ExpiresAt { get; set; }
}
