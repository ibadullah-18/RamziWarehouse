using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GrandWall.Api.Controllers;

[ApiController]
[AllowAnonymous]
public sealed class AccountDeletionController : ControllerBase
{
    [HttpGet("/account-deletion")]
    public ContentResult Get()
    {
        const string html = """
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>GrandWall - Account Deletion</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 760px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.65;
            color: #181818;
        }

        h1, h2 {
            color: #111;
        }

        .box {
            background: #f5f5f5;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>GrandWall Account Deletion</h1>

    <p>
        This page explains how users of the GrandWall application
        can request deletion of their account and associated personal data.
    </p>

    <h2>How to request account deletion</h2>

    <div class="box">
        <ol>
            <li>Contact your GrandWall administrator.</li>
            <li>Provide the username of the account you want deleted.</li>
            <li>Ask the administrator to submit an account deletion request.</li>
            <li>Your request will be reviewed and processed after your identity and account are verified.</li>
        </ol>
    </div>

    <h2>Data that may be deleted</h2>

    <p>
        When an account deletion request is processed, account information
        such as the user's name, username, authentication credentials and
        active authentication sessions may be deleted or anonymized where
        technically possible.
    </p>

    <h2>Operational records and retention</h2>

    <p>
        Some operational records are subject to GrandWall's retention rules.
        Orders, product return records and attendance records that have a
        scheduled deletion date are automatically deleted when their
        retention period expires. Associated stored images are also removed
        where applicable.
    </p>

    <p>
        Certain records may need to be retained where necessary for
        security, integrity, legal obligations, dispute resolution or
        legitimate business record-keeping. Such information is retained
        only for as long as necessary for those purposes.
    </p>

    <h2>Contact</h2>

    <p>
        To start an account deletion request, contact the administrator
        responsible for your GrandWall account.
    </p>
</body>
</html>
""";

        return Content(html, "text/html; charset=utf-8");
    }
}
