using System.ComponentModel.DataAnnotations;

namespace SchoolAdmissionApi.Models;

public class Class
{
    [Key]
    public string Id { get; set; } = "c_" + Guid.NewGuid().ToString("n")[..6];

    [Required]
    public string ClassName { get; set; } = string.Empty; // e.g., "Class 6"

    [Required]
    public string Shift { get; set; } = string.Empty; // e.g., "Morning Shift"

    [Required]
    public int TotalSeats { get; set; }

    public ICollection<Hold> Holds { get; set; } = new List<Hold>();
}
