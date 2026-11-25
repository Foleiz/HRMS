# HRMS API (.NET 10) - build บนเครื่อง dev แล้วส่ง image ขึ้น server (ไม่ build บน server)
# sdk stage รันตาม platform ของเครื่อง build (เร็ว ไม่ต้อง emulate) ผลลัพธ์ publish เป็น portable DLL ใช้ได้กับทุก CPU
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/ src/
RUN dotnet publish src/Hrms.Api/Hrms.Api.csproj -c Release -o /app /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app .
# แทนที่ appsettings.json ของ repo (มีรหัส/คีย์ dev) ด้วยไฟล์เปล่า: ความลับและค่าตั้งทั้งหมดมาจาก env ของ container เท่านั้น (ดู deploy/api/hrms-api.env.example)
COPY appsettings.docker.json /app/appsettings.json
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_gcServer=0 \
    DOTNET_GCConserveMemory=5 \
    TZ=Asia/Bangkok
EXPOSE 8080
ENTRYPOINT ["dotnet", "Hrms.Api.dll"]
