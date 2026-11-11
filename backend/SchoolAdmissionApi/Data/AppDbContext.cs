using Microsoft.EntityFrameworkCore;
using SchoolAdmissionApi.Models;

namespace SchoolAdmissionApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Class> Classes => Set<Class>();
    public DbSet<Hold> Holds => Set<Hold>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Class>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ClassName).IsRequired();
            entity.Property(e => e.Shift).IsRequired();
            entity.Property(e => e.TotalSeats).IsRequired();
        });

        modelBuilder.Entity<Hold>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ClassId, e.StudentId });
        });
    }
}
