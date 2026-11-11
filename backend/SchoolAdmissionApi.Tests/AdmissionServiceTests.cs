using Microsoft.EntityFrameworkCore;

using Microsoft.Extensions.Configuration;

using SchoolAdmissionApi.Data;

using SchoolAdmissionApi.Models;

using SchoolAdmissionApi.Services;
// using SchoolAdmissionApi.Services;
using Xunit;

namespace SchoolAdmissionApi.Tests;

public class AdmissionServiceTests
{
    private AppDbContext GetInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new AppDbContext(options);
    }

    private IConfiguration GetConfiguration()
    {
        var inMemorySettings = new Dictionary<string, string> {
            {"HOLD_DURATION_SECONDS", "600"}
        };
        return new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings!)
            .Build();
    }

    [Fact]
    public async Task CreateClass_ShouldSucceed()
    {
        var context = GetInMemoryDbContext(Guid.NewGuid().ToString());
        var service = new AdmissionService(context, GetConfiguration());

        var result = await service.CreateClassAsync(new CreateClassRequest("Class 6 Morning", 50));

        Assert.NotNull(result);
        Assert.Equal("Class 6 Morning", result.Name);
        Assert.Equal(50, result.TotalSeats);
    }

    [Fact]
    public async Task ConfirmHold_MultipleTimes_IsIdempotent()
    {
        var context = GetInMemoryDbContext(Guid.NewGuid().ToString());
        var service = new AdmissionService(context, GetConfiguration());

        var cls = await service.CreateClassAsync(new CreateClassRequest("Class 7 Day", 10));
        var studentId = "20152691234567890";
        var hold = await service.CreateHoldAsync(cls.Id, studentId);

        var confirm1 = await service.ConfirmHoldAsync(hold.HoldId, studentId);
        var confirm2 = await service.ConfirmHoldAsync(hold.HoldId, studentId);

        Assert.Equal("CONFIRMED", confirm1.Status);
        Assert.Equal("CONFIRMED", confirm2.Status);

        var updatedClass = await service.GetClassByIdAsync(cls.Id);
        Assert.Equal(1, updatedClass!.ConfirmedSeats);
        Assert.Equal(0, updatedClass.HeldSeats);
    }

    [Fact]
    public async Task HoldSeat_Concurrently_DoesNotExceedTotalSeats()
    {
        var context = GetInMemoryDbContext(Guid.NewGuid().ToString());
        var service = new AdmissionService(context, GetConfiguration());

        var cls = await service.CreateClassAsync(new CreateClassRequest("Class 10 - Concurrent Test", 5));

        var tasks = new List<Task>();
        int successCount = 0;
        int failureCount = 0;

        for (int i = 0; i < 20; i++)
        {
            var studentId = $"201526912345678{i:D2}";
            tasks.Add(Task.Run(async () =>
            {
                try
                {
                    var localContext = GetInMemoryDbContext(context.Database.ProviderName!);
                    var localService = new AdmissionService(localContext, GetConfiguration());
                    await localService.CreateHoldAsync(cls.Id, studentId);
                    Interlocked.Increment(ref successCount);
                }
                catch
                {
                    Interlocked.Increment(ref failureCount);
                }
            }));
        }

        await Task.WhenAll(tasks);

        var finalClass = await service.GetClassByIdAsync(cls.Id);

        Assert.Equal(5, successCount);
        Assert.Equal(15, failureCount);
        Assert.Equal(5, finalClass!.HeldSeats);
        Assert.Equal(0, finalClass.AvailableSeats);
    }
}
