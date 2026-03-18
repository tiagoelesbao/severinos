# ClickUp API — Documentação Completa

> 📅 Extraído em: 15/03/2026 09:52  
> 🔗 Fonte: https://developer.clickup.com  
> 📊 Total de páginas: 210 (34 guias + 176 endpoints)

---

## 📑 Índice

### Guias (/docs)

- **[Getting Started](#getting-started)**
  - [Authentication](#authentication)
  - [Trytheapi](#trytheapi)
- **[General](#general)**
  - [General V2 V3 Api](#general-v2-v3-api)
  - [Rate Limits](#rate-limits)
  - [General Time](#general-time)
  - [Open Api Spec](#open-api-spec)
- **[MCP (Model Context Protocol)](#mcp-model-context-protocol)**
  - [Connect An Ai Assistant To Clickups Mcp Server](#connect-an-ai-assistant-to-clickups-mcp-server)
  - [Connect An Ai Assistant To Clickups Mcp Server 1](#connect-an-ai-assistant-to-clickups-mcp-server-1)
  - [Mcp Tools](#mcp-tools)
- **[Tasks](#tasks)**
  - [Tasks](#tasks)
  - [Customfields](#customfields)
  - [Attachments](#attachments)
  - [Taskfilters](#taskfilters)
  - [Range](#range)
  - [Move A Task To A New List](#move-a-task-to-a-new-list)
- **[Views](#views)**
  - [Views](#views)
  - [Filter Views](#filter-views)
- **[Communication](#communication)**
  - [Comments](#comments)
  - [Chat](#chat)
  - [Comment Formatting](#comment-formatting)
  - [Task Comments Pagination](#task-comments-pagination)
- **[Docs](#docs)**
  - [Docsimportexportlimitations](#docsimportexportlimitations)
- **[Webhooks](#webhooks)**
  - [Webhooks](#webhooks)
  - [Webhooksignature](#webhooksignature)
  - [Webhookhealth](#webhookhealth)
  - [Webhookspacepayloads](#webhookspacepayloads)
  - [Webhookfolderpayloads](#webhookfolderpayloads)
  - [Webhooklistpayloads](#webhooklistpayloads)
  - [Webhooktaskpayloads](#webhooktaskpayloads)
  - [Automationwebhookpayload](#automationwebhookpayload)
  - [Webhookgoaltargetpayloads](#webhookgoaltargetpayloads)
  - [Automationcallwebhooklegacypayload](#automationcallwebhooklegacypayload)
- **[FAQ](#faq)**
  - [Faq](#faq)
  - [Common Errors](#common_errors)

### Referência da API (/reference)

- **[Authorization](#authorization)**
  - [Getaccesstoken](#getaccesstoken)
  - [Getauthorizeduser](#getauthorizeduser)
- **[Attachments](#attachments)**
  - [Createtaskattachment](#createtaskattachment)
- **[Comments](#comments)**
  - [Gettaskcomments](#gettaskcomments)
  - [Createtaskcomment](#createtaskcomment)
  - [Getchatviewcomments](#getchatviewcomments)
  - [Createchatviewcomment](#createchatviewcomment)
  - [Getlistcomments](#getlistcomments)
  - [Createlistcomment](#createlistcomment)
  - [Updatecomment](#updatecomment)
  - [Deletecomment](#deletecomment)
  - [Getthreadedcomments](#getthreadedcomments)
  - [Createthreadedcomment](#createthreadedcomment)
- **[Custom Task Types](#custom-task-types)**
  - [Getcustomitems](#getcustomitems)
- **[Custom Fields](#custom-fields)**
  - [Getaccessiblecustomfields](#getaccessiblecustomfields)
  - [Getfolderavailablefields](#getfolderavailablefields)
  - [Getspaceavailablefields](#getspaceavailablefields)
  - [Getteamavailablefields](#getteamavailablefields)
  - [Setcustomfieldvalue](#setcustomfieldvalue)
  - [Removecustomfieldvalue](#removecustomfieldvalue)
- **[Folders](#folders)**
  - [Getfolders](#getfolders)
  - [Createfolder](#createfolder)
  - [Getfolder](#getfolder)
  - [Updatefolder](#updatefolder)
  - [Deletefolder](#deletefolder)
  - [Createfolderfromtemplate](#createfolderfromtemplate)
- **[Goals](#goals)**
  - [Getgoals](#getgoals)
  - [Creategoal](#creategoal)
  - [Getgoal](#getgoal)
  - [Updategoal](#updategoal)
  - [Deletegoal](#deletegoal)
  - [Createkeyresult](#createkeyresult)
  - [Editkeyresult](#editkeyresult)
  - [Deletekeyresult](#deletekeyresult)
- **[Guests](#guests)**
  - [Inviteguesttoworkspace](#inviteguesttoworkspace)
  - [Getguest](#getguest)
  - [Editguestonworkspace](#editguestonworkspace)
  - [Removeguestfromworkspace](#removeguestfromworkspace)
  - [Addguesttotask](#addguesttotask)
  - [Removeguestfromtask](#removeguestfromtask)
  - [Addguesttolist](#addguesttolist)
  - [Removeguestfromlist](#removeguestfromlist)
  - [Addguesttofolder](#addguesttofolder)
  - [Removeguestfromfolder](#removeguestfromfolder)
- **[Lists](#lists)**
  - [Getlists](#getlists)
  - [Createlist](#createlist)
  - [Getfolderlesslists](#getfolderlesslists)
  - [Createfolderlesslist](#createfolderlesslist)
  - [Getlist](#getlist)
  - [Updatelist](#updatelist)
  - [Deletelist](#deletelist)
  - [Addtasktolist](#addtasktolist)
  - [Removetaskfromlist](#removetaskfromlist)
  - [Createfolderlistfromtemplate](#createfolderlistfromtemplate)
  - [Createspacelistfromtemplate](#createspacelistfromtemplate)
- **[Members](#members)**
  - [Gettaskmembers](#gettaskmembers)
  - [Getlistmembers](#getlistmembers)
- **[Roles](#roles)**
  - [Getcustomroles](#getcustomroles)
- **[Shared Hierarchy](#shared-hierarchy)**
  - [Sharedhierarchy](#sharedhierarchy)
- **[Spaces](#spaces)**
  - [Getspaces](#getspaces)
  - [Createspace](#createspace)
  - [Getspace](#getspace)
  - [Updatespace](#updatespace)
  - [Deletespace](#deletespace)
- **[Tags](#tags)**
  - [Getspacetags](#getspacetags)
  - [Createspacetag](#createspacetag)
  - [Editspacetag](#editspacetag)
  - [Deletespacetag](#deletespacetag)
  - [Addtagtotask](#addtagtotask)
  - [Removetagfromtask](#removetagfromtask)
- **[Tasks (API)](#tasks-api)**
  - [Gettasks](#gettasks)
  - [Createtask](#createtask)
  - [Gettask](#gettask)
  - [Updatetask](#updatetask)
  - [Deletetask](#deletetask)
  - [Getfilteredteamtasks](#getfilteredteamtasks)
  - [Mergetasks](#mergetasks)
  - [Gettaskstimeinstatus](#gettaskstimeinstatus)
  - [Getbulktaskstimeinstatus](#getbulktaskstimeinstatus)
  - [Createtaskfromtemplate](#createtaskfromtemplate)
- **[Task Checklists](#task-checklists)**
  - [Createchecklist](#createchecklist)
  - [Editchecklist](#editchecklist)
  - [Deletechecklist](#deletechecklist)
  - [Createchecklistitem](#createchecklistitem)
  - [Editchecklistitem](#editchecklistitem)
  - [Deletechecklistitem](#deletechecklistitem)
- **[Task Relationships](#task-relationships)**
  - [Adddependency](#adddependency)
  - [Deletedependency](#deletedependency)
  - [Addtasklink](#addtasklink)
  - [Deletetasklink](#deletetasklink)
- **[Templates](#templates)**
  - [Gettasktemplates](#gettasktemplates)
- **[Workspaces](#workspaces)**
  - [Getauthorizedteams](#getauthorizedteams)
  - [Getworkspaceseats](#getworkspaceseats)
  - [Getworkspaceplan](#getworkspaceplan)
- **[User Groups](#user-groups)**
  - [Createusergroup](#createusergroup)
  - [Updateteam](#updateteam)
  - [Deleteteam](#deleteteam)
  - [Getteams1](#getteams1)
- **[Time Tracking](#time-tracking)**
  - [Gettimeentrieswithinadaterange](#gettimeentrieswithinadaterange)
  - [Createatimeentry](#createatimeentry)
  - [Getsingulartimeentry](#getsingulartimeentry)
  - [Deleteatimeentry](#deleteatimeentry)
  - [Updateatimeentry](#updateatimeentry)
  - [Gettimeentryhistory](#gettimeentryhistory)
  - [Getrunningtimeentry](#getrunningtimeentry)
  - [Removetagsfromtimeentries](#removetagsfromtimeentries)
  - [Getalltagsfromtimeentries](#getalltagsfromtimeentries)
  - [Addtagsfromtimeentries](#addtagsfromtimeentries)
  - [Changetagnamesfromtimeentries](#changetagnamesfromtimeentries)
  - [Startatimeentry](#startatimeentry)
  - [Stopatimeentry](#stopatimeentry)
- **[Time Tracking (Legacy)](#time-tracking-legacy)**
  - [Gettrackedtime](#gettrackedtime)
  - [Tracktime](#tracktime)
  - [Edittimetracked](#edittimetracked)
  - [Deletetimetracked](#deletetimetracked)
- **[Users](#users)**
  - [Inviteusertoworkspace](#inviteusertoworkspace)
  - [Getuser](#getuser)
  - [Edituseronworkspace](#edituseronworkspace)
  - [Removeuserfromworkspace](#removeuserfromworkspace)
- **[Views (API)](#views-api)**
  - [Getteamviews](#getteamviews)
  - [Createteamview](#createteamview)
  - [Getspaceviews](#getspaceviews)
  - [Createspaceview](#createspaceview)
  - [Getfolderviews](#getfolderviews)
  - [Createfolderview](#createfolderview)
  - [Getlistviews](#getlistviews)
  - [Createlistview](#createlistview)
  - [Getview](#getview)
  - [Updateview](#updateview)
  - [Deleteview](#deleteview)
  - [Getviewtasks](#getviewtasks)
- **[Webhooks (API)](#webhooks-api)**
  - [Getwebhooks](#getwebhooks)
  - [Createwebhook](#createwebhook)
  - [Updatewebhook](#updatewebhook)
  - [Deletewebhook](#deletewebhook)
- **[Extra (Descobertos)](#extra-descobertos)**
  - [Publicpatchacl](#publicpatchacl)
  - [Publicpatchacl](#publicpatchacl)
  - [Queryauditlog](#queryauditlog)
  - [Queryauditlog](#queryauditlog)
  - [Getchatchannels](#getchatchannels)
  - [Getchatchannels](#getchatchannels)
  - [Createchatchannel](#createchatchannel)
  - [Createlocationchatchannel](#createlocationchatchannel)
  - [Createdirectmessagechatchannel](#createdirectmessagechatchannel)
  - [Getchatchannel](#getchatchannel)
  - [Updatechatchannel](#updatechatchannel)
  - [Deletechatchannel](#deletechatchannel)
  - [Getchatchannelfollowers](#getchatchannelfollowers)
  - [Getchatchannelmembers](#getchatchannelmembers)
  - [Getchatmessages](#getchatmessages)
  - [Createchatmessage](#createchatmessage)
  - [Patchchatmessage](#patchchatmessage)
  - [Deletechatmessage](#deletechatmessage)
  - [Getchatmessagereactions](#getchatmessagereactions)
  - [Createchatreaction](#createchatreaction)
  - [Deletechatreaction](#deletechatreaction)
  - [Getchatmessagereplies](#getchatmessagereplies)
  - [Createreplymessage](#createreplymessage)
  - [Getchatmessagetaggedusers](#getchatmessagetaggedusers)
  - [Getsubtypes](#getsubtypes)
  - [Searchdocspublic](#searchdocspublic)
  - [Searchdocspublic](#searchdocspublic)
  - [Createdocpublic](#createdocpublic)
  - [Getdocpublic](#getdocpublic)
  - [Getdocpagelistingpublic](#getdocpagelistingpublic)
  - [Getdocpagespublic](#getdocpagespublic)
  - [Createpagepublic](#createpagepublic)
  - [Getpagepublic](#getpagepublic)
  - [Editpagepublic](#editpagepublic)
  - [Movetask](#movetask)
  - [Movetask](#movetask)
  - [Updatetimeestimatesbyuser](#updatetimeestimatesbyuser)
  - [Replacetimeestimatesbyuser](#replacetimeestimatesbyuser)
  - [Getparententityattachments](#getparententityattachments)
  - [Getparententityattachments](#getparententityattachments)
  - [Postentityattachment](#postentityattachment)

---

# 📘 Parte 1: Guias e Conceitos

> Documentação conceitual, fluxos de autenticação, webhooks e boas práticas.

---


## Getting Started


### Authentication

> 🔗 `https://developer.clickup.com/docs/authentication`

#

Authentication

To use the ClickUp API, you must authenticate every request.

For personal use, authenticate with your [personal API token](doc:authentication#personal-token).

For apps or integrations that other people use, use the [OAuth flow](doc:authentication#oauth-flow), allowing users to authorize Workspaces for your app.

Include the token in the **Authorization** header of your requests.

Both methods ensure that you and your users only have access to the information permitted by ClickUp.

> 👍
>
> ###
>
> [View the OAuth endpoints.](ref:getaccesstoken)

#

Personal Token

Use a personal API token for individual or testing purposes. Personal tokens begin with `pk_`.
Add the token to the header: `Authorization: {personal_token}`. This is also needed to use the Try-It feature in the API docs.

##

Generate or regenerate a Personal API Token

  1. Log in to ClickUp.

  2. In the upper-right corner, click your avatar.

  3. Select **Settings**.

  4. In the sidebar, click **Apps**. Or click [here](https://app.clickup.com/settings/apps) to go directly to your settings.

  5. Under **API Token** , click **Generate** or **Regenerate**.

> 👀
>
> ###
>
> Note
>
> You'll need to sign in to your ClickUp account in order to generate or regenerate a token.

  6. Click **Copy** to copy the personal token to your clipboard. Personal tokens never expire.


#

Build Apps for others - OAuth Flow

To allow others to use your app, implement the OAuth2 flow so each user has their own token for accessing their ClickUp resources.

OAuth resources and specs:

  * **Authentication:** OAuth 2.0
  * **Grant Type:** `Authorization Code`. [Learn more](https://oauth.net/2/grant-types/authorization-code/).
  * **Authorization URL:** `https://app.clickup.com/api`
  * **Access Token URL:** `https://api.clickup.com/api/v2/oauth/token`


> 👀
>
> ###
>
> Note
>
> ClickUp uses the [authorization code](https://oauth.net/2/grant-types/authorization-code/) `grant type`.
>  Use your personal API key to use the Try-It feature in the API docs.

##

Step 1: Create an OAuth app

Only Workspace owners or admins can create OAuth apps.

  1. Log in to ClickUp.
  2. In the upper-right corner, click your avatar.
  3. Select **Settings**.
  4. In the sidebar, click **Apps**.
  5. Click **Create new app**.
  6. Name the app and add a [redirect URL](https://www.oauth.com/oauth2-servers/redirect-uris/).
  7. You'll receive a `client_id` and `secret`.


##

Step 2: Retrieve an Authorization Code

Send users to this URL to connect their ClickUp account:
`https://app.clickup.com/api?client_id={client_id}&redirect_uri={redirect_uri}`

You can also add a `state` parameter:
`https://app.clickup.com/api?client_id={client_id}&redirect_uri={redirect_uri}&state={state}`

> 👀
>
> ###
>
> Note
>
> Non-SSL redirect URIs may not be supported in the future.

Users will be redirected back to the `redirect_uri` with the authorization code after logging in.

###

Select Workspaces


Users can authorize one or more Workspaces. Use the **[Get Authorized Teams (Workspaces)](ref:getauthorizedteams)** endpoint to see which Workspaces are authorized. Redirect users to the authorization URL to modify Workspace permissions.

##

Step 3: Request a Token

Use the [Get Access Token](ref:getaccesstoken) endpoint with `client_id`, `client_secret`, and `code` to get the access token. This token is used in the `Authorization: Bearer {access_token}` header for all API requests made on behalf of the user.

The access token currently does not expire. This is subject to change.

**Learn more about OAuth:**

  * [OAuth.net](https://oauth.net/)
  * [OAuth Simplified](https://www.oauth.com/)
  * [Digital Ocean Intro to OAuth 2.0](https://www.digitalocean.com/community/tutorials/an-introduction-to-oauth-2)


__

* * *

---


### Try the API in your web browser

> 🔗 `https://developer.clickup.com/docs/trytheapi`

##

Try an endpoint

Every API endpoint in our documentation can be tested directly from your browser using the interactive "Try It" panel on the right side of each endpoint. Requests are made against the Workspace from which the API token was generated.

  1. Navigate to any endpoint in the Reference section
  2. Look for the "Try It" panel on the right side
  3. Fill in the required parameters and customize optional ones in the API docs
  4. Click "Try It" to make the request


##

Authentication

Under _Credentials_ , paste your [personal API key](doc:authentication#personal-token) to authenticate your requests.
All API calls are made against the Workspace from which the API token was generated.

__

* * *

---


## General


### ClickUp API v2 and v3 Terminology

> 🔗 `https://developer.clickup.com/docs/general-v2-v3-api`

#

Terminology in API v2 and v3

The ClickUp API docs include both **v2** and **v3** versions, which leads to some terminology differences. In **v2** , "Team" is used where **v3** now says "Workspace." This guide helps clarify these differences so you can navigate the API with ease.

##

Clarifying Teams, Groups, and Workspaces in the ClickUp API

In the ClickUp API, the terms **Teams** , **Groups** , and **Workspaces** are used in different contexts across versions. This guide will help you understand the distinctions between these terms and how they are used across various API endpoints, especially between version 2 (`/api/v2/`) and version 3 (`/api/v3/`).

###

1\. **Teams** : Used in API v2 to Mean Workspaces

In the `/api/v2/` endpoints, **Teams** refer to what ClickUp now more commonly calls **Workspaces**. This terminology can be confusing because "Teams" typically refers to user groups in many other contexts.

  * **Teams as Workspaces (API v2)** :
    * In API v2, **Teams** are the overarching organizational entity that contains users, Spaces, Folders, Lists, and tasks.
    * Think of a **Team** in v2 as equivalent to a **Workspace** —it manages all the resources and structures needed to organize your ClickUp environment.
  * **Example** :
    * API Path: `/v2/team/{team_id}/space`
    * Function: Manage and interact with Spaces within a Team (Workspace).


####

Key Points for API v2:

  * **"Teams" = Workspaces**.
  * Used in endpoints that manage Workspaces and their contents.
  * This terminology is specific to API v2 and is carried over from earlier versions of ClickUp.


###

2\. **Workspaces** : The Consistent Term in API v3

In the `/api/v3/` endpoints, **Workspaces** are used consistently to refer to the main organizational unit, replacing the term "Team" from earlier versions. The transition from "Teams" to "Workspaces" in v3 reflects the current naming convention within ClickUp, aligning better with user expectations.

  * **Workspaces in API v3** :
    * In API v3, **Workspaces** clearly refer to the top-level entity that contains users, Spaces, and related resources.
    * This removes the ambiguity that existed in v2 where "Team" was used in the same context.
  * **Example** :
    * API Path: `/v3/workspaces/{workspace_id}/docs`
    * Function: Access or manage documents within a Workspace.


####

Key Points for API v3:

  * **"Workspaces"** are consistently used in API v3.
  * This term is now the standard for referring to the primary organizational unit in ClickUp.


###

3\. **Groups** : User Groups within a Team (Workspace)

**Groups** always refer to clusters of users within a **Team** (or **Workspace**). This concept is used across both API versions but in slightly different contexts:

  * In **API v2** , **Groups** are subsets of users within a **Team** (Workspace). They allow collective role management, making it easier to assign tasks or set permissions for groups of users.

  * **Example** :

    * API Path: `/v2/team/{team_id}/group`
    * Function: Manage user groups within a Workspace (Team).
  * In **API v3** , **Groups** continue to refer to user clusters within a **Workspace** , but the terminology aligns more clearly with the broader usage of **Workspaces** instead of **Teams**.


####

Key Points for Groups:

  * **"Groups"** always refers to user clusters.
  * They are used for assigning collective roles and permissions within a **Workspace(Team)** .


##

Summary of Terms by API Version

Term| Meaning in API v2| Meaning in API v3
---|---|---
**Teams**|  Equivalent to **Workspaces**|  Not used in this context; replaced by **Workspaces**
**Workspaces**|  Not used explicitly, but implied by "Teams"| The primary organizational unit (replaces Teams)
**Groups**|  User groups within a Team (Workspace)| User groups within a Workspace (same meaning as v2)

##

Best Practices for Understanding the API

  1. **For API v2 endpoints** :

     * Remember that **Teams** refer to what is now called **Workspaces**.
     * This can be confusing if you’re more familiar with the current ClickUp terminology, but keep in mind that these endpoints were created before "Workspace" became the standard.
  2. **For API v3 endpoints** :

     * The term **Workspace** is consistently used to refer to the overarching organizational entity.
     * If you're using API v3, this terminology aligns with what you see in the current ClickUp UI, eliminating the previous confusion.
  3. **User Groups** :

     * Across both versions, **Groups** always refer to collections of users within a **Workspace(Team)** for managing roles and permissions.


By keeping these distinctions in mind, you can more effectively navigate and integrate with the ClickUp API without the confusion that arises from the overlapping terminology in API v2.

__

* * *

---


### Rate Limits

> 🔗 `https://developer.clickup.com/docs/rate-limits`

#

Rate Limits

The ClickUp API applies rate limits per token. These limits apply to both personal and OAuth tokens and vary by Workspace Plan of the Workspace hosting the token.

##

Rate Limits by Workspace Plan

  * **Free Forever, Unlimited, Business** : 100 requests per minute per token.
  * **Business Plus** : 1,000 requests per minute per token.
  * **Enterprise** : 10,000 requests per minute per token.


##

Error handling

If you exceed the rate limit, the API returns a `HTTP 429` status code.
The response header on error contains

  * `X-RateLimit-Limit` \- Current rate limit for the token.
  * `X-RateLimit-Remaining` \- Number of requests remaining in the current rate limit window.
  * `X-RateLimit-Reset` \- Time when the rate limit will reset, in Unix timestamp format.


> 👍
>
> ###
>
> Tip
>
> Learn more about [ClickUp Plans](https://clickup.com/pricing).

__

* * *

---


### Date formatting

> 🔗 `https://developer.clickup.com/docs/general-time`

#

Date Formatting

Dates are formatted as milliseconds since the Unix epoch (January 1, 1970) returned as an integer OR in a string.
Looks at specific API docs to see what format is required.
More information In JavaScript Date Object [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)

#

Timezones

Our API always returns timestamps in [UTC (Coordinated Universal Time)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

The start date and due date on tasks that don't have a start or due time will default to 4 am in the local time zone of the user who added the start or due date.

If that user changes their timezone later, task start dates and due dates will not be retroactively updated.

__

* * *

---


### OpenAPI Specification

> 🔗 `https://developer.clickup.com/docs/open-api-spec`

#

OpenAPI Specification

The raw OpenAPI specification for the ClickUp API is available for each version of our Public API.

The specifications can be used with various API tools and code generators that support the OpenAPI format.

  * [V2 Open API Specification](https://developer.clickup.com/openapi/clickup-api-v2-reference.json).
  * [V3 Open API Specification](https://developer.clickup.com/openapi/ClickUp_PUBLIC_API_V3.yaml)




> 👍
>
> ###
>
> Tip
>
> You can copy the above URLs to import them into API tools such as [Postman](https://www.postman.com/).

__

* * *

---


## MCP (Model Context Protocol)


### ClickUp's MCP Server

> 🔗 `https://developer.clickup.com/docs/connect-an-ai-assistant-to-clickups-mcp-server`

The Model Context Protocol (MCP) is a secure, standardized framework that lets external AI agents interact with ClickUp Workspace data—like tasks, lists, folders, and docs—using natural language. MCP helps users, especially developers, automate workflows, connect third-party AI tools, and enable agentic AI features in their preferred apps, all while keeping security and user control tight.

> 🧪
>
> **Public Beta** : ClickUp's MCP server is currently in public beta, and we're actively seeking feedback [here](https://feedback.clickup.com/public-api/p/clickup-mcp-server-first-party-and-official).

ClickUp's MCP Server is available on [all plans](https://clickup.com/pricing).

#

What you can do

With ClickUp's MCP server, you can:

  * **Orchestrate task workflows** : Manage tasks with assignees, priorities, and due dates across lists and spaces.
  * **Build executive reports** : Create release notes, status updates, and portfolio summaries from tasks and docs.
  * **Track time** : Log time entries and manage timers.
  * **Answer work questions** : Search tasks, docs, and comments for quick answers.
  * **Collaborate in comments and chat** : Summarize threads, extract action items, and post updates. And more!


#

Supported MCP Clients

ClickUp MCP supports all major MCP clients and Apps. We maintain an allowlist of vetted MCP client redirect URIs to protect our users from malicious phishing attacks. If your MCP client isn’t on the list, you can submit a request to have it reviewed [here](https://forms.clickup-stg.com/333/f/ad-3426753/WF90UVNDA3H2GXA6TD).

  * [Antigravity](https://antigravity.google/docs/mcp)
  * [ChatGPT](https://chatgpt.com/)
  * [Civic](https://www.civic.com/)
  * [Claude Desktop](https://www.claude.com/download)
  * [Claude Code](https://www.claude.com/product/claude-code)
  * [Code Rabbit](http://coderabbit.ai/)
  * [Cursor](https://cursor.com/)
  * [Devin](https://devin.ai/)
  * [Dustt](https://dust.tt/)
  * [Glean](https://www.glean.com/)
  * [Make](https://www.make.com/)
  * [Microsoft Copilot Studio](https://www.microsoft.com/en-us/microsoft-365-copilot/microsoft-copilot-studio)
  * [Migma](https://migma.ai/)
  * [Poke.com](https://poke.com/)
  * [Postman](https://www.postman.com/)
  * [Shortwave](https://www.shortwave.com/)
  * [tasklet.ai](http://tasklet.ai/)
  * [VS Code](https://code.visualstudio.com/)
  * [Windsurf](https://windsurf.com/)
  * [Workato](https://www.workato.com/)


#

Setup instructions

Learn how to [setup your AI assistant](https://developer.clickup.com/docs/connect-an-ai-assistant-to-clickups-mcp-server-1) with ClickUp's MCP server.

#

Supported tools

Learn about the [tools](https://developer.clickup.com/docs/mcp-tools) available through ClickUp's MCP Server with example prompts you can use in your AI assistant.

#

Rate limits

The MCP wraps around our existing API and will fall under the [same limits](https://developer.clickup.com/docs/rate-limits), which some LLM calls could accidentally trigger depending on how it calls.

#

FAQ

**Q. Can I authenticate with my own API keys or Auth access tokens?**

**A.** No, you cannot authenticate using your own API keys or Auth access tokens. We only support OAuth for authentication.




**Q. Why can't I delete things with the MCP?**

**A.** For the time being, we haven’t added any deletion tools as a safety measure. Feel free to leave your feedback here.




**Q. Can I search my apps with Connected Search using ClickUp MCP?**

**A.** No, it is not possible to search connected apps.




**Q. Can I connect my custom LLM Client?**

**A.** Yes, if your team builds an MCP client implementation that meets the following criteria:

  * Implements the JSON-RPC 2.0 protocol over HTTP.
  * Supports OAuth 2.1 with PKCE authentication.
  * Follows the MCP specification.
  * Submits its for review [here](https://forms.clickup-stg.com/333/f/ad-3426753/WF90UVNDA3H2GXA6TD).


__Updated about 1 month ago

* * *

---


### MCP Server Setup Instructions

> 🔗 `https://developer.clickup.com/docs/connect-an-ai-assistant-to-clickups-mcp-server-1`

#

Setup instructions

Below are the setup instructions for some of the most popular AI assistants.

##

Claude

Set up Claude to use the ClickUp MCP server!

###

Pro, Team, Enterprise

If you're on the Pro, Team, or Enterprise plan:

  1. In a browser or the desktop app, navigate to Settings in the sidebar.
  2. Scroll to Connectors at the bottom and click Add.
  3. In the prompt, enter the following:


  * Name: ClickUp
  * Remote MCP Server URL: <https://mcp.clickup.com/mcp>


###

Free

If you're on the Free plan of Claude, you'll set up the MCP server from the Claude desktop app:

  1. Go to your Claude desktop settings page.
  2. Click on Developer section.
  3. Click on edit config then open the `claude_desktop_config.json` with your editor of choice.
  4. Add the following and restart the Claude desktop app:


JSON


    {
      "mcpServers": {
        "clickup": {
          "command": "npx",
          "args": ["-y", "mcp-remote", "https://mcp.clickup.com/mcp"]
        }
      }
    }

###

Claude Code

Use the follow command: `claude mcp add --transport http clickup https://mcp.clickup.com/mcp`

Once you've opened a Claude Code session, run /mcp to go through the authentication flow.

##

Cursor

Install [here](https://cursor.directory/mcp/clickup), or from Cursor's [MCP directory page](https://cursor.com/docs/context/mcp/directory).

###

Manual installation

To manually set up Cursor for the ClickUp MCP server, add the following to your mcp.json file:

JSON


    {
      "mcpServers": {
        "clickup": {
          "url": "https://mcp.clickup.com/mcp"
        }
      }
    }

##

Devin

Set up [Devin](https://devin.ai/) to use the ClickUp MCP Server.

###

Manual installation

  1. Open your **Devin settings**.
  2. Navigate to the **MCP Marketplace**.
  3. Click the button to **Add your own MCP**.
  4. Enter a name for the server (e.g., "ClickUp").
  5. Set the **Transport Type** to **HTTP**.
  6. Enter a short description.
  7. Paste the following link into the **Server URL** field: <https://mcp.clickup.com/mcp>
  8. For Authentication, select **OAuth**.
  9. Enable the server.


The first time you use the integration, Devin will attempt to connect and ask for authorization. Click the link provided to authorize your ClickUp workspace.

##

Microsoft Copilot Studio

Set up [Microsoft Copilot Studio](https://www.microsoft.com/en-us/microsoft-365-copilot/microsoft-copilot-studio) to use the ClickUp MCP Server.

###

Manual installation

  1. Open Microsoft Copilot Studio and navigate to your Agent.
  2. Scroll down to the **Tools** section.
  3. Click **Add Tool**.
  4. Then click **New tool**
  5. Select **Model Context Protocol**.
  6. Enter a Name for the tool, such as `ClickUp`
  7. Enter a short Description for the tool.
  8. Paste the Server URL: <https://mcp.clickup.com/mcp>
  9. For Authentication, select **OAuth**.
  10. Ensure the configuration is set to **Dynamic Discovery (DCR)**.
  11. Click **Create** to finish setting up the tool.


##

VS Code

Set up VS Code to use the ClickUp MCP server!

###

Manual installation

To manually set up VS Code for the ClickUp MCP server, open a terminal and run the following command:

`code --add-mcp '{"type":"http","name":"clickup","url":"https://mcp.clickup.com/mcp"}'`

Then, from inside VS Code, go to your extensions section.

You will find ClickUp MCP at the bottom of the list of MCP servers.

Click the settings **cogwheel** on the ClickUp MCP and click **Start Server**.

Follow the links to finish the authentication flow.

##

Windsurf

To set up Windsurf for the ClickUp MCP server:

  1. Press Ctrl + , on Windows or Cmd + , on Mac to open your Windsurf settings.
  2. Under Scroll to Cascade, click MCP servers.
  3. Click Add Server, then select Add custom server.
  4. Copy the following JSON to your Windsurf MCP config file:

JSON

         {
           "mcpServers": {
             "clickup": {
               "serverUrl": "https://mcp.clickup.com/mcp"
             }
           }
         }


##

ChatGPT

> 🔓
>
> **Note** : In Team, Enterprise, and Edu workspaces, only owners and admins have permission to configure MCP servers.

To set up ChatGPT to use the ClickUp MCP server:

  1. Navigate to **Settings** and click **Connectors**.
  2. Add a custom connector with the server URL: `https://mcp.clickup.com/mcp`.
  3. It will be visible in the **Deep Research** tool. This tool can be accessed by clicking the **plus** button next to the input text box.
  4. You may need to add the server as a source.


**Note** : Connectors can only be used with **Deep Research**.

##

Setup a custom MCP server in ChatGPT

> 🧑‍💻
>
> **Note:** Developer Mode must be used because the MCP server is not an official connector and is considered untrusted.

  1. Navigate to Settings in ChatGPT.

  2. Go to **Apps and Connectors**.

  3. Scroll to the bottom. Under Advanced Settings, enable **Developer Mode** .

  4. Return to the main Apps and Connectors page. The "Create" button should now be visible.

  5. Click **Create** and select **ClickUp** as the connector.

  6. Set the **MCP Server URL** : `https://mcp.clickup.com/mcp`

  7. Set Authentication to **OAuth**.

  8. Review the disclaimer and check the box for **I understand and want to continue**.

  9. Complete the authentication process:

     1. Select your ClickUp Workspace.
     2. Click **Connect**.
  10. Once connected, close the authentication window.

  11. In ChatGPT, click the **Plus** button, then **More** , and select your custom connector.

  12. Confirm that ClickUp is now available as a connector and test by requesting your ClickUp Workspace Hierarchy.


> 💡
>
> Want to use the ClickUp connector in ChatGPT? [Learn more](https://help.openai.com/en/articles/12628397-clickup-synced-connector)

##

Antigravity

To set up [Antigravity](https://antigravity.google/) to use the ClickUp MCP Server, you can review the Antigravity Docs from Google [here](https://antigravity.google/docs/mcp#connecting-custom-mcp-servers) .

Following the instructions under **Connecting Custom MCP Servers** , add the following to your `mcp_config.json` file:

JSON


    {
        "mcpServers": {
            "clickup": {
                "serverUrl": "https://mcp.clickup.com/mcp"
            }
        }
    }

##

Other clients

> 👍
>
> **Vetted List** : Reminder that if your MCP isn’t on our vetted list of [supported clients](https://developer.clickup.com/docs/connect-an-ai-assistant-to-clickups-mcp-server#supported-mcp-clients), you can request a review [here](https://forms.clickup-stg.com/333/f/ad-3426753/WF90UVNDA3H2GXA6TD).

You can configure most other clients to use ClickUp's MCP server with the following settings:


    Command: npx
    Arguments: -y mcp-remote https://mcp.clickup.com/mcp
    Environment: None




__

* * *

---


### Supported Tools

> 🔗 `https://developer.clickup.com/docs/mcp-tools`

The ClickUp MCP exposes many of the capabilities available in our API. The real magic happens when it automatically combines and uses multiple tools in a single call to perform various actions together.

#

Search

Tool| Definition| Example usage (for an AI assistant)
---|---|---
Search Workspace| Searches for items across the entire ClickUp Workspace, including tasks, Lists, Folders, and Docs.| "Find all tasks related to the 'Q4 Marketing Launch'."

#

Task management

Tool| Definition| Example usage (for an AI assistant)
---|---|---
Create Task| Creates a new task in a specific List. You can specify details like the task name, description, assignees, due date, and priority.| "Create a task to 'Draft blog post' in the 'Content Pipeline' List, assign it to me, and set the due date for this Friday."
Get Task| Retrieves the full details of a single task using its unique task ID.| "What are the details for task 'Design-123'?"
Update Task| Modifies the properties of an existing task. This can include changing the task's name, description, status, assignees, or due date.| "Change the status of task 'Draft blog post' to 'In Progress' and add 'Review' as a subtask."
Create Bulk Tasks| Creates multiple tasks in a specified List with a single API call.| "Add these items as new tasks in the 'Onboarding' List: 'Send welcome email', 'Schedule orientation', and 'Set up hardware'."
Update Bulk Tasks| Modifies multiple tasks at once. This is useful for changing the status, assignee, or due date for a group of tasks simultaneously.| "Move all tasks in the 'Sprint 3' List with the 'Ready for Review' status to 'In Review'."
Attach File to Task| Uploads and attaches a file (like a document, image, or ZIP file) to a specific task.| "Attach this document [file_upload] to the 'Submit Final Report' task."
Add Tag to Task| Applies an existing tag (label) to a task for categorization.| "Add the 'Urgent' tag to task 'Fix login bug'."
Remove Tag from Task| Removes a specific tag from a task.| "Remove the 'Backend' tag from task 'Update button color'."

#

Task comments

Tool| Definition| Example usage (for an AI assistant)
---|---|---
Get Task Comments| Retrieves all comments from a specific task.| "What's the latest update on the 'Develop new feature' task?"
Create Task Comment| Adds a new comment to a task. This can be used to ask questions, provide updates, or @mention other team members.| "Add a comment to task 'Design-123' saying: '@Mark, can you please provide the latest mockups?'"

#

Time tracking

Tool| Definition| Example usage (for an AI assistant)
---|---|---
Get Task Time Entries| Retrieves all time log entries for a specific task.| "How much time has been logged for the 'Client Research' task?"
Start Time Tracking| Starts a timer for a specific task for the current user.| "Start tracking time for the 'Code Review' task."
Stop Time Tracking| Stops the currently active timer for the user.| "Stop the timer."
Add Time Entry| Manually adds a block of time (a time entry) to a task, including a start and end time or a duration.| "Log 2 hours of work on the 'Database optimization' task for yesterday."
Get Current Time Entry| Checks if the user has a timer currently running and, if so, returns the details of that time entry.| "What am I currently tracking time for?"

#

Workspace Hierarchy

Tool| Definition| Example usage (for an AI assistant)
---|---|---
Get Workspace Hierarchy| Retrieves the full structure of the Workspace, including all Spaces, Folders, and Lists.| "Show me all the Lists in the 'Engineering' Space."
Create List| Creates a new List within a specific Folder or Space.| "Create a new List named 'Sprint 4 Planning' in the 'Product' Folder."
Create List in Folder| Creates a new List specifically inside a designated Folder.| "Inside the 'Marketing Campaigns' Folder, create a new List called 'Social Media Content'."
Get List| Retrieves the details and settings for a single List.| "What are the custom statuses for the 'Bugs' List?"
Update List| Modifies the settings of an existing List, such as changing its name or color.| "Rename the 'New Ideas' List to 'Approved Ideas'."
Get Folder| Retrieves the details for a single Folder, including the Lists it contains.| "List all the Lists inside the 'Client Projects' Folder."
Create Folder| Creates a new Folder within a specific Space.| "Create a new Folder named 'Q1 Projects' in the 'Operations' Space."
Update Folder| Modifies the settings of an existing Folder, such as changing its name.| "Rename the 'Design' Folder to 'Design Team'."

#

Members and assignees

Tool| Definition| Example usage (for an AI assistant)
---|---|---
Get Workspace Members| Retrieves a list of all members and guests in the Workspace.| "Who is on the 'Engineering' team?"
Find Member by Name| Searches for a Workspace member using their name or email.| "What is David Smith's user ID?"
Resolve Assignees| A utility to confirm and retrieve the user objects for a list of potential assignees, often used before adding them to a task.| "When you say, 'Assign this task to Mark and Sarah,' this tool finds the correct user IDs for 'Mark' and 'Sarah'."

#

Chat

Tool| Definition| Example usage (for an AI assistant)
---|---|---
Get Chat Channels| Retrieves a list of all Chat channels (views) in the Workspace.| "List all available Chat channels."
Send Chat Message| Sends a message to a specific Chat channel.| "Post a message in the 'General' channel: 'Team lunch at 1 PM today.'"

#

Docs

Tool| Definition| Example usage (for an AI assistant)
---|---|---
Create Document| Creates a new Doc within the Workspace, usually in a specific location (like a Space or Folder) or in the private Docs area.| "Create a new document named 'Project Kickoff Notes' in the 'Project Phoenix' Space."
List Document Pages| Retrieves the structure or table of contents of a Doc, listing all its pages.| "What are the pages in the 'Employee Handbook' Doc?"
Get Document Pages| Retrieves the content of one or more pages from a specific Doc.| "Show me the content of the 'Onboarding' page from the 'Team Wiki' Doc."
Create Document Page| Adds a new page (or sub-page) to an existing Doc.| "Add a new page titled 'Security Protocols' to the 'Company Policies' Doc."
Update Document Page| Edits the content of an existing page within a Doc.| "On the 'Security Protocols' page, add a new section for 'Password Management'."




__Updated about 2 months ago

* * *

---


## Tasks


### Tasks

> 🔗 `https://developer.clickup.com/docs/tasks`

#

Tasks Overview

Tasks in ClickUp are the building blocks for organizing work. Each task can contain detailed information, such as descriptions, assignees, priorities, due dates, and custom fields. Using the ClickUp API, you can create, update, and manage tasks programmatically. When creating a task, you can set metadata like the task’s name, assignees, priority level, and time estimates. Additionally, tasks can be linked to other tasks, tagged, or customized with custom fields to suit specific needs. The API also allows for handling task dependencies and grouping assignees for collaborative workflows.

Here are the key components when creating a task using the ClickUp API:

  * **Name and Description** : The task’s name (`name`) and description (`description` or `markdown_description`).
  * **Assignees** : Users assigned to the task, managed via an array of user IDs.
  * **Status and Priority** : The task’s status (`status`) and priority (`priority`), which follow preset values.
  * **Dates** : Start and due dates (`start_date`, `due_date`), with options for including or excluding time components.
  * **Tags** : Tags (`tags`) for categorizing tasks.
  * **Custom Fields** : Customizable fields that allow for flexible task management, set via the `custom_fields` array.
  * **Time Estimates and Points** : Time estimates (`time_estimate`) for task completion, and points (`points`) to quantify task size or effort.
  * **Parent and Dependencies** : The `parent` field to be defined for sub-tasks, and the `links_to` field to manage task dependencies.


##

Setting Assignees

`assignees` is an array of user IDs to assign to a task. You can retrieve available user IDs using the `Get Teams` (Workspaces) endpoint.

##

Setting Priority

`priority` corresponds to the priority levels in the ClickUp UI:

  * `1`: Urgent
  * `2`: High
  * `3`: Normal
  * `4`: Low


Priorities cannot be customized.

##

Task Relationships

Tasks in ClickUp can be linked by plain links or Dependencies.

###

Linked Tasks

Linked tasks can be [added](ref:addtasklink) and [removed](ref:deletetasklink) via the task relationship API.

The [GET Task API](ref:gettask) returns linked tasks in the response body:

JSON


    "linked_tasks": [
        {
            "task_id": "8xdfdjbgd",
            "link_id": "8xdfm9vmz",
            "date_created": "1744930048464",
            "userid": "395492",
            "workspace_id": "333"
        }
    ]

###

Task Dependencies

Dependent tasks can be [added](ref:adddependency) and [removed](ref:deletedependency) via the task relationship API.

The [GET Task API](ref:gettask) returns dependent tasks in the response body:

JSON


    "dependencies": [
        {
            "task_id": "8xdfm9vmz",
            "depends_on": "8xdfe67cz",
            "type": 1,
            "date_created": "1744930371817",
            "userid": "395492",
            "workspace_id": "333",
            "chain_id": null
        }
    ]

##

Setting Time Estimates

`time_estimate` values are in milliseconds.

##

Using Custom Fields

You can set Custom Fields when creating a task using the [Create Task](ref:createtask) endpoint. To update Custom Fields on an existing task, use the [Set Custom Field Value](ref:setcustomfieldvalue) endpoint, as the [Update Task](ref:updatetask) endpoint does not support updating Custom Fields.

##

Formatting Task Descriptions

To include double quotation marks in `text_content`, `description`, or `markdown_description` fields, escape them with `\"`.

Example:

JSON


    "description": "Here is some text. \"This is speech.\" Additional text."

This appears as:


    Here is some text. "This is speech." Additional text.

##

Using Markdown in Task Descriptions

You can use `markdown_description` instead of `description` to format task descriptions with Markdown.

Supported Markdown features include:

Headers
Emphasis
Unordered/ordered lists
Images and links
Blockquotes
Inline code

For more on Markdown syntax, see [GitHub’s guide](https://guides.github.com/features/mastering-markdown/).

##

Large Requests and other Considerations

If a list contains many tasks and subtasks, the request body can become quite large, potentially causing API timeouts. We're developing API v3 to address these issues.

__

* * *

---


### Custom Fields

> 🔗 `https://developer.clickup.com/docs/customfields`

#

Custom Fields

You can work with certain types of Custom Fields using the ClickUp API.

> 👍
>
> ###
>
> Tip
>
> Explore the [Custom Field Endpoints](ref:getaccessiblecustomfields).

##

The Custom Field object

Below is an example Custom Field object. This is the information you'll see about each Custom Field when using the [Get Accessible Custom Fields](ref:getaccessiblecustomfields) endpoint.

JSON


    {
        "id": "5dc86497-098d-4bb0-87d6-cf28e43812e7",
        "name": "Text Field",
        "type": "text",
        "type_config": {},
        "date_created": "1577378759142",
        "hide_from_guests": false
    }

###

Properties of the Custom Field object

There are four key properties you will use when working with Custom Fields in the ClickUp API.

  1. **id:** This is the unique identifier of a Custom Field available on at least one List in your ClickUp Workspace.
  2. **type:** Refers to the Custom Field type.
  3. **type_config:** Sets the acceptable values for Custom Field types with specific requirements.
  4. **value:** The actual data shown on tasks in ClickUp.


> 👀
>
> ###
>
> Note
>
> Free Forever Plans have 60 uses of Custom Fields. Each use of the Set Custom Field Value endpoint counts as 1 use per request. Uses accumulate across a Workspace and do not reset. When you reach the use limit, you won't lose any data, but you won't be able to edit or create new items with that feature.

##

Custom Field types

Here is a list of the available [Custom Field types](https://docs.clickup.com/en/articles/3071474-custom-field-types). Use these values in the `type` property.

  * `url`: The URL of any website.
  * `drop_down`: A series of options in a menu.
  * `labels`: A flexible list of options, similar to Tags.
  * `email`: A formatted email address.
  * `phone`: A formatted phone number with country and area codes.
  * `date`: A custom date and time.
  * `short_text`: Enter a single line of plain text.
  * `text`: Enter a paragraph of plain text.
  * `checkbox`: A true or false checkbox.
  * `number`: A formatted numeric value.
  * `currency`: A **Money** Custom Field. A formatted amount of money in any currency.
  * `tasks`: Tasks linked together without Relationships.
  * `users`: A **People** Custom Field. Pick people and Teams.
  * `emoji`: A **Rating** Custom Field. Use emoji to rate items on a numeric scale.
  * `automatic_progress`: An automatically calculated progress bar.
  * `manual_progress`: A progress bar that's manually set.
  * `location`: A formatted address based on Google Maps.


> 👀
>
> ###
>
> Note
>
> [Voting Custom Field](https://help.clickup.com/hc/en-us/articles/24266511749527-Use-Voting-Custom-Fields) values are returned as part of the Custom Field array. Voting Custom Field values cannot be set using the API.

##

The type_config property

The `type_config` property determines what options and requirements apply to a Custom Field. Examples are included below.

###

Drop down

Dropdown options exist in the `options` array. The order of items is determined by the array index. A `placeholder` value (string) and `default` option are available, but are not currently used in ClickUp.
Sorting options include `manual`, `name_asc`, and `name_desc`. The `orderindex` property is a unique, sequential number starting at `0` and ending at the length of the array.

JSON


    {
        "name": "My Dropdown Field",
        "type": "drop_down",
        "type_config": {
            "sorting": "manual",
            "default": 0,
            "placeholder": "Select a value",
            "options": [
                {
                    "id": "option_1_id",
                    "name": "Option 1",
                    "color": "#FFFFF",
                    "orderindex": "0"
                },
                {
                    "id": "option_2_id",
                    "name": "Option 2",
                    "color": "#000000",
                    "orderindex": "1"
                }
            ]
        }
    }

###

Currency (Money)

You must specify a particular currency in the `currency_type` property. The `default` option is available, but it is not currently used in ClickUp.

JSON


    {
        "name": "My Currency Field",
        "type": "currency",
        "type_config": {
            "precision": 2,
            "currency_type": "USD",
            "default": 10
        }
    }

###

Emoji

The `code_point` property must be a valid Unicode emoji code point, usually written like `U+1f613`. Omit the `U+` and pass only the hex value as a string.

The `count` property sets the maximum number of values the rating can hold, with a minimum value of `1` and a maximum of `5`.

JSON


    {
        "name": "My Emoji Rating Field",
        "type": "emoji",
        "type_config": {
            "code_point": "1f613",
            "count": 5
        }
    }

###

Labels

A flexible list of options, similar to Tags.

Sorting options include `manual`, `name_asc`, and `name_desc`. The `orderindex` property is always provided, must be unique, starts at `0`, and ends at `Array.length`.

JSON


    {
        "name": "My Label Field",
        "type": "labels",
        "type_config": {
            "sorting": "manual"
            "options": [
                {
                    "id": "option_1_id",
                    "label": "Label 1",
                    "color": "#123456",
                    "orderindex": "0"
                },
                {
                    "id": "option_2_id",
                    "label": "Label 2",
                    "color": "#FFFFFF",
                    "orderindex": "1"
                }
            ]
        }
    }

###

Automatic progress

An automatically calculated progress bar.

JSON


    {
        "name": "Automatic Progress Bar",
        "type": "progress",
        "type_config": {
            "method": "automatic",
            "tracking": {
                "subtasks": true,
                "assigned_comments": true,
                "checklists": true
            }
        }
    }

###

Manual progress

A progress bar that's manually set.
Start, end and current are absolute values. ClickUp will display the current value as a percentage of the total.

JSON


    {
        "name": "Manual Progress Bar",
        "type": "progress",
        "type_config": {
            "method": "manual",
            "start": 0,
            "end": 100,
            "current": 50
        }
    }

##

Field values

To set a field value on a task, use the [Set Custom Field Value endpoint](ref:setcustomfieldvalue). The following shows how to change specific custom field types.

The request will always require the body `{ value: ... }` based on the Custom Field Type.

###

Url

The value must be a string and a valid URL.

JSON


    { "value": "https://clickup.com" }

###

Drop down

The value must be an ID that matches one of the existing options retrieved from `type_config`.

JSON


    { "value": "option_1_id" }

###

Email

The value must be a string and a valid email.

JSON


    { "value": "[[email protected]](/cdn-cgi/l/email-protection)" }

###

Phone

The value must be a string and a valid phone number with country code.

JSON


    { "value": "+1 123 456 7890" }

###

Date

The `value` must be Unix time in milliseconds. By default, or if you include `"time": false`, only the date is displayed in ClickUp.
To display time in the ClickUp UI, include `"time": true`.

> 👀
>
> ###
>
> Note
>
> When requesting tasks that include a Date Custom Field (e.g., when using the GET task or other calls), but do not display a time in ClickUp, the API will return a value in Unix time in milliseconds of 4:00 am in the authorized user's timezone.

JSON


    {
    "value": 1565993299379,
    "value_options": {
        "time": true
    }
    }

###

Text

The value must be a string.

JSON


    { "value": "Some text" }

###

Checkbox

The value must be a boolean.

JSON


    { "value": true }

###

Number

The value must be a number.

JSON


    { "value": -28 }

###

Currency

The value must be a number.

JSON


    { "value": 80000 }

###

Tasks

The value must be an object with the following format. The `task_ids` in `add` will be added to the field, and the `task_ids` in `rem` will be removed. The user must have access to all tasks in the request.

JSON


    {
        "value": {
            "add": ["task_id_1", "task_id_2"],
            "rem": ["task_id_3"]
        }
    }

###

Users

The value must be an object with the following format. The users in `add` will be added to the field, and the users in `rem` will be removed.

JSON


    {
        "value": {
            "add": ["user_id_1", "user_id_2"],
            "rem": ["user_id_3"]
        }
    }

###

Filter by users

To filter by users using the [Get Filtered Team Tasks](ref:getfilteredteamtasks) endpoint, input each `user_id` as an array into the value parameter.

JSON


    {
       "field_id":"bd12538-4cf0-51f3-13h1-a1c0bedae3f7",


     "operator":"ANY",
       "value":["user_id_1", "user_id_2"]
    }

###

Emoji (Rating)

The value must be an integer that meets the following conditions:

  * The value must be greater than or equal to zero, **and**
  * The `count` property (which is the maximum value possible) must be greater than or equal to the `value`.


`0 <= value <= field.type_config.count.`

JSON


    {
        "value": 4
    }

###

Automatic progress

Automatic progress fields cannot be set by user.

###

Manual progress

The value must be an object with the current value of the progress. For example, if your `start` and `end` are `10` and `30`, you would pass `20` to set the manual progress bar at 50%.

JSON


    {
        "value": {
            "current": 20
        }
    }

###

Labels

The value must be an object with the following format. The `ID` for each label must come from the field's `type_config`. Any labels that currently exist on a task will be overwritten.

JSON


    {
        "value": ["label_1_id", "label_2_id"]
    }

###

Location

You must provide the latitude `lat`, longitude `lng`, and formatted address per [Google Maps Geocoding API](https://developers.google.com/maps/documentation/geocoding/overview).

JSON


    {
        "value": {
            "location":{
                "lat": -28.016667,
                "lng": 153.4
                },
            "formatted_address": "Gold Coast QLD, Australia"
        }
    }

__

* * *

---


### Attachments

> 🔗 `https://developer.clickup.com/docs/attachments`

Upload attachments to tasks using the ClickUp API. This guide outlines the key requirements for file uploads.

> 👀
>
> ###
>
> Note
>
> For detailed code examples, refer to the [Create Task docs](ref:createtask).

##

Key Requirements

  * **Content-Type** : Use `multipart/form-data` in your request header, not `application/json`.
  * **File Upload Structure** :
    * Attach files using the `attachment[]` array (e.g., `attachment[0]`, `attachment[1]`).
    * Optional query parameters: `custom_task_ids`, `team_id`.


###

Limitations

  * The maximum file size is 1 GB.
  * No limitations on file types.


##

API Endpoint

  * **Endpoint** : [Create Task Attachment](ref:createtaskattachment)
  * **Method** : `POST`
  * **Authorization** : Requires a valid API token.


###

Error Handling

The API returns a `4xx` error, with the error code `GBUSED_005` when the account storage limit has been exceeded.

##

Using Postman?

You can use multipart/form data using Postman by following [these instructions](https://learning.getpostman.com/docs/postman/sending-api-requests/requests/#form-data).

__

* * *

---


### Filter tasks using Custom Fields

> 🔗 `https://developer.clickup.com/docs/taskfilters`

#

Filter tasks using Custom Fields

Use Custom Fields to filter tasks via the following endpoints:

  * **[Get Tasks](ref:gettasks)** : For tasks within a specific List.
  * **[Get Filtered Team Tasks](ref:getfilteredteamtasks)** : For tasks across your entire Workspace.


> 👍
>
> ###
>
> Tip
>
> Use **Get Tasks** when you know the List where the tasks are located. Use **Get Filtered Team Tasks** to find tasks anywhere in your Workspace.

##

Using Custom Field Filters

When filtering by a Custom Field, provide a stringified JSON array of objects that must include the following properties:

  * `field_id`
  * `value`
  * `operator`


###

`field_id`

The `field_id` refers to the ID of the Custom Field you want to filter by. Retrieve it using the **[Get Accessible Custom Fields](ref:getaccessiblecustomfields)** endpoint.

###

Operators

The supported operators for filtering are:

  * `=`\- contains (fuzzy match)
  * `==`\- exact match for text Custom Fields
  * `<` \- less than
  * `<=` \- less than or equal to
  * `>` \- greater than
  * `>=` \- greater than or equal to
  * `!=` \- not equal to
  * `!=` \- does not contain for text Custom Fields.
  * `!==`\- does not exact match for text Custom Fields.
  * `IS NULL` \- field is not set
  * `IS NOT NULL` \- field is set
  * [`RANGE`](doc:range) \- is between
  * `ANY` \- matches any criteria
  * `ALL` \- matches all criteria
  * `NOT ANY` \- does not match any criteria
  * `NOT ALL` \- does not match all criteria


###

Value

The `value` corresponds to the data in the Custom Field. This depends on the Custom Field type.

> 👍
>
> ###
>
> Tip
>
> Create a task and add a value to the Custom Field you want to filter. Then, use the **[Get Task](ref:gettask)** endpoint to identify the `field_id` and its acceptable `value`.

###

Example Query

Here's an example of a Custom Field query parameter:

JSON


    ?custom_fields=[{"field_id":"de761538-8ae0-42e8-91d9-f1a0cdfbd8b5","operator":">","value":2},{...}]

####

Breakdown

  1. `field_id`: Identifies the Custom Field. In this case, it's a Number Custom Field named **Number of Reports**.
  2. `operator`: Specifies the comparison operator. Here, `>` means "greater than."
  3. `value`: Specifies the threshold value. In this example, it's `2`.


This query returns tasks where the **Number of Reports** is **3 or more**.

  4. `{...}`: Represents additional Custom Fields to include in the filter, if needed.


###

Example Query

Here's another example of a Custom Field query parameter:

JSON


    ?custom_fields=[{"field_id":"ac123456-8ae0-42e8-91d9-f1a0cdfb1ce7","operator":"=","value":"project"},{...}]

####

Breakdown

In this example we're looking for tasks that _contains_ the word `project`.

  1. `field_id`: Identifies the Custom Field. In this case, it's a Short text Custom Field named **Feature**.
  2. `operator`: Specifies the comparison operator. Here, `=` means "contains".
  3. `value`: Specifies the text in the field. In this example, it's `project`.
  4. `{...}`: Represents additional Custom Fields to include in the filter, if needed.


###

Find exact matches

To find exact matches, we can use the same query with the `==`operator instead:

JSON


    ?custom_fields=[{"field_id":"ac123456-8ae0-42e8-91d9-f1a0cdfb1ce7","operator":"==","value":"project"},{...}]

####

Breakdown

`field_id`: Identifies the Custom Field. In this case, it's a Short text Custom Field named **Feature**.

  1. `operator`: Specifies the comparison operator. Here, `==` means "exact match".
  2. `value`: Specifies the exact text in the field. In this example, it's `project`.
  3. `{...}`: Represents additional Custom Fields to include in the filter, if needed.




__

* * *

---


### Range operator with Custom Fields

> 🔗 `https://developer.clickup.com/docs/range`

#

Use the range operator with Custom Fields

The `RANGE` operator allows you to filter tasks using Custom Fields by specifying a range of values.

> 📘
>
> The examples provided are formatted for clarity. These query parameters can be used in a [Get Filtered Team Tasks](ref:getfilteredteamtasks) request.

You can define the range in two ways:

  1. As an array of low and high values.
  2. As objects with explicitly defined `low_value` and `high_value`.


##

Define Range as an Array

Specify the range using an array with two values:

  * The first value represents the low end of the range.
  * The second value represents the high end.


###

Example

When filtering a Date Custom Field:

JSON


    https://api.clickup.com/api/v2/team/{team_Id}/task?custom_fields=[
      {
        "field_id": "ebea8db0-82f8-4d94-b09c-79992f17a8bb",
        "operator": "RANGE",
        "value": [1671246000000, 1671505200000]
      }
    ]

##

Define Range as Objects

Define the range explicitly by specifying `low_value` and `high_value` as separate fields.

###

Example

When filtering a Date Custom Field:

JSON


    https://api.clickup.com/api/v2/team/{team_Id}/task?custom_fields=[
      {
        "field_id": "ebea8db0-82f8-4d94-b09c-79992f17a8bb",
        "operator": "RANGE",
        "value": {
          "low_value": 1671246000000,
          "high_value": 1671505200000
        }
      }
    ]

__

* * *

---


### Move a task to a new List

> 🔗 `https://developer.clickup.com/docs/move-a-task-to-a-new-list`

You can move a task to a new List using the [Move Task endpoint](https://developer.clickup.com/reference/movetask) .

You can move a task from it's current List to a new List. This removes the task from it's current List.

Using the Move Task endpoint doesn't add or remove the task from any additional Lists.

When you move the task via the public API you can:

  * Bring Custom Fields from the current List to the new List.
  * Update the task's current status to a new status from the new List.


##

Add Custom Fields to the new List

You can add the Custom Fields from the task's current List to it's new List, using the `move_custom_fields`request body parameter.

This option adds all Custom Fields to the new the List.

For example:

JSON


    {
    	"move_custom_fields": true
    }

##

Add specific Custom Fields to the new List

You can add specific Custom Fields to the new List using both the `move_custom_fields` and `custom_fields_to_move`request body parameters.

This option allows you to specify which Custom Fields are added to the new List.

For example:

JSON


    {
      "move_custom_fields": true,
      "custom_fields_to_move": [
        "abcd1234", // The ID of a Custom Field
    		"def9876" // The ID of another Custom Field
    	]
    }

##

Status mapping

If the task's current status is not available in the new List, you'll need to map it to a new status using the `status_mappings` parameter in the request body.

For example:

JSON


    {
    	"status_mappings": [
    		{
    			"source_status": "acb1234", // The ID of the task's current status in the current List.
    			"destination_status": "def9876" // The ID of the new status for the task in the new List.
    		}
    	]
    }

**Status IDs** are available in the response of the [Get Task](https://developer.clickup.com/reference/gettask) endpoint.

##

Tasks in Multiple Lists

Using the Move Task endpoint doesn't add or remove the task from any additional Lists.

For example:

  * Task A lives in List 1.
  * Task A is added to List 2.
  * You can move task A to List 3. It will still be added to List 2.


To add or remove tasks to other Lists, you can use:

  * [POST Add Task to List](https://developer.clickup.com/reference/addtasktolist)
  * [DELETE Remove Task From List](https://developer.clickup.com/reference/removetaskfromlist)




__

* * *

---


## Views


### Views

> 🔗 `https://developer.clickup.com/docs/views`

#

Views

You can create, update, delete, group, sort, and [filter views](doc:filter-views) at any level of the ClickUp hierarchy using the API.

To get task information displayed in a view, use the [Get View Tasks endpoint](ref:getviewtasks).

> 👍
>
> ###
>
> Tip
>
> Explore the [View endpoints](ref:createteamview).

##

View Type

The `view type` determines the view's format. Supported values are:

  * `list`
  * `board`
  * `calendar`
  * `gantt`


> 👀
>
> ###
>
> Note
>
> Page views, such as Docs and Whiteboards, are not supported through the public API.

##

View Parent

The `parent` parameter specifies where the view is located in the ClickUp hierarchy and must include the ID of the Workspace, Space, Folder, or List.

The available `parent.type` values are:

  * Team (everything level): 7
  * Space: 4
  * Folder: 5
  * List: 6


##

View Object Example

JSON


    {
        "name": "View Name",
        "type": "list",
        "parent": {
            "id": 333,
            "type": 7
        },
        "grouping": {
            "field": "status",
            "dir": 1
        },
        "filters": {
            "op": "AND",
            "fields": [
                {
                    "field": "assignee",
                    "op": "EQ",
                    "values": []
                }
            ],
            "search": "",
            "show_closed": false
        },
        "sorting": {
            "fields": [
                {
                    "field": "dateCreated",
                    "dir": -1
                }
            ]
        },
        "columns": {
            "fields": [
                {
                    "field": "dateCreated"
                }
            ]
        }
    }

__

* * *

---


### Filter Views

> 🔗 `https://developer.clickup.com/docs/filter-views`

#

Filter Views

Filter tasks in a view via API.

The filtering system in your project management software is designed to help you refine your task list by specifying detailed criteria based on task attributes. This system is structured around four key components:

**fields** , **operators** , **values** , and **groups**.

  * **Fields** represent the task attributes you want to filter by, such as `status`, `tag`, or `dueDate`.
  * **Operators** define the type of comparison to perform on the field. Common operators include:
    * `EQ` (equals): Checks if the field exactly matches the specified value(s).
    * `ANY`: Checks if the field contains any of the specified values.
    * Other operators can include relational comparisons like `LT` (less than), `GT` (greater than), or functions like `yesterday`.
  * **Values** are the specific criteria you're filtering for. These can be single values or arrays of values, depending on the operator and field.
  * **Groups** allow you to combine multiple filters using logical operators to create complex queries. Filters within a group can be combined using `AND` or `OR` operators, and groups themselves can be nested and combined in the same way.


The overall structure works as follows:

  1. **Define Individual Filters** : Each filter is an object that specifies a field, an operator, and one or more values. For example:
     * `{field: "status", op: "EQ", values: ["product backlog", "product review"]}`
     * `{field: "tag", op: "ANY", values: ["#bug"]}`
     * `{field: "dueDate", op: "EQ", values: [{op: "yesterday"}]}`
  2. **Organize Filters into Groups** : Filters are grouped to determine the order of operations. Groups are arrays of filter indices that reference the individual filters you've defined. For instance, `[[0, 1], [2]]` creates two groups: the first contains filters 0 and 1, and the second contains filter 2.
  3. **Apply Logical Operators Between Groups** : The `filter_group_ops` array specifies how to combine these groups using logical operators like `AND` and `OR`. For example, `["OR", "AND"]` indicates that within the first group, filters are combined using `OR`, and then the result is combined with the second group using `AND`.


By structuring your filters this way, you can create sophisticated queries to find tasks that meet complex criteria, such as tasks that are either in the "product backlog" or "product review" status **OR** have the tag "#bug", **AND** are due yesterday.

##

Operator

The `op` property specifies how filter criteria combine. Available values:

  * `AND`
  * `OR`


##

Search by Task Name and Description

The `search` property filters by task name, description, and Custom Field text. This filter is only available when [creating a view](ref:createteamview). Search is implemented with basic string matching.

Search is performed on the filtered results, regardless of the `op` value provided for the search operator. Logically `(all filters) AND search`.

Example:

JSON


    {
        "filters": {
            "op": "AND",
            "fields": [],
            "search": "zebra",
            "show_closed": false
        }
    }

##

Show Closed

The `show_closed` property hides closed tasks by default (`false`). It always uses the `AND` operator when combined with other filters.

##

Filter Fields

The `filters.fields` array holds most of the filter criteria. Each object follows this format:

JSON


    {
        "field": "field name",
        "op": "op name",
        "values": []
    }

###

Archived

To filter archived tasks, use the `archived` field.

Operators:

  * `EQ`
  * `NOT`


Values: The values array is ignored but must be included as `[]`.

JSON


    {
        "field": "archived",
        "op": "EQ",
        "values": []
    }

###

Assignee

Filter tasks by assignee.

Operators:

  * `ANY`, `ALL`, `NOT ANY`, `NOT ALL`


Values: Array of user IDs. To filter by Me Mode, use the `me` value instead of user IDs and set it to `true`.

JSON


    {
        "field": "assignee",
        "op": "ANY",
        "values": [182, 183]
    }

###

Priority

Filter tasks by priority.

Operators:

  * `EQ`, `NOT`


Values:

  * `-1`: No priority
  * `1`: Urgent
  * `2`: High
  * `3`: Normal
  * `4`: Low


JSON


    {
        "field": "priority",
        "op": "EQ",
        "values": ["4", "-1"]
    }

###

Date Filters

Filter by standard or custom date fields.

####

Standard Date Fields

Available fields for all tasks:

  * Due date: `dueDate`
  * Start date: `startDate`
  * Date created: `dateCreated`
  * Date updated: `dateUpdated`
  * Date done: `dateDone`
  * Date closed: `dateClosed`


####

Date Custom Fields

Use the format `cf_{{field_id}}` to reference any custom fields.

####

Date Operators

  * `EQ`, `NOT`
  * Dynamic date values: `today`, `yesterday`, `overdue`, `thisweek`, etc.


Values:
Due date values are dynamic values, which allow you to specify values such as `today` or `overdue` and query due dates without actually setting a specific timestamp.

Each value is an object with a descriptive operator (`op`) property and sometimes one or more reference values.

  * "op": "today"
  * "op": "yesterday"
  * "op": "tomorrow"
  * "op": "next7" (next seven days)
  * "op": "last7" (last seven days)
  * "op": "overdue"
  * "op": "earlier" (today and earlier)
  * "op": "thisweek"
  * "op": "thismonth"
  * "op": "lastmonth"
  * "op": "eq", "dueDate": 1579240800000 (exact date)
  * "op": "ls", "dueDate": 1579240800000 (before date)
  * "op": "gt", "dueDate": 1579240800000 (after date)
  * "op": "ra", "dueDate": 1579240800000, "startDate": 1579068000000 (date range)
  * "op": "notNull" (any date)
  * "op": "null" (no date)


The below example will include tasks where the due date is set (equals not null):

JSON


    {
        "field": "dueDate",
        "op": "EQ",
        "values": [{ "op": "notNull" }]
    }

###

Status

Filter tasks by status or status type.
Status types contain multiple statuses. For example: `active`, `done`, or `closed`.

Operators:

  * `EQ`, `NOT`


Values:

  * Filter by status type use `"type": "{status_type_name}"`, eg `"type": "active"`.
  * Filter by status name use `"{status_name}"`, eg `"in progress"`.


Example:

JSON


    {
        "field": "status",
        "op": "EQ",
        "values": ["in progress", "{ 'type': 'done' }"]
    }

###

Tag

Filter tasks by tags.

Operators:

  * `ANY`, `ALL`, `NOT ANY`, `NOT ALL`


Values: Array of tag names.

JSON


    {
        "field": "tag",
        "op": "ANY",
        "values": ["tag 1", "tag 2"]
    }

###

Recurring

Filter based on whether tasks are recurring.

Operators:

  * `EQ` (recurring), `NOT` (non-recurring)


Values: The values array is ignored but must be included.

JSON


    {
        "field": "recurring",
        "op": "EQ",
        "values": []
    }

###

Custom Fields

Use the format `cf_{{field_id}}` to filter by Custom Fields.

Find available Custom Fields with these endpoints:

  * [Get Accessible Custom Fields](ref:getaccessiblecustomfields)
  * [Get Task](ref:gettask)
  * [Get Tasks](ref:gettasks)
  * [Get Filtered Team Tasks](ref:getfilteredteamtasks)


Operators:

  * All Custom Field types support the `EQ` (equals) and `NOT` (not equals) filter operators.
  * For number and currency Custom Fields, you can also use the `GT` (greater than), `GTE` (greater than or equal to), `LT` (less than), and `LTE` (less than or equal to) operators.
  * For Date Custom Fields, refer to the available Date operators.


####

Filter by Set/Not Set

Use `SET` and `NOT SET` to determine if value is `null`.
Use:

  * `"op": "IS SET"`
  * `"op": "IS NOT SET"`


Pass `[null]` into the `values` key.

Example:

JSON


    {
        "field": "cf_ec49d70b-72e1-40c2-b04c-b0f728499f28",
        "op": "EQ",
        "values": [null]
    }

__

* * *

---


## Communication


### Comments

> 🔗 `https://developer.clickup.com/docs/comments`

#

Comments

The ClickUp API allows you to view, add, and update or delete comments on tasks, Lists, and Chat views.

##

Viewing Comments

Retrieve existing comments via the API.

###

Endpoints

Use the following endpoints to fetch comments:

  * [Task Comments](ref:gettaskcomments)
  * [List Comments](ref:getlistcomments)
  * [Chat View Comments](ref:getchatviewcomments)


##

Adding Comments

Create comments for tasks, Lists, and Chat views through the API.

###

Endpoints

  * [Create a Task Comment](ref:createtaskcomment)
  * [Create a List Comment](ref:createlistcomment)
  * [Create a Chat View Comment](ref:createchatviewcomment)


##

Updating and Deleting Comments

Modify or remove existing comments using the API. These endpoints apply to task, List, and Chat view comments.

###

Endpoints

  * [Update Comment](ref:updatecomment)
  * [Delete Comment](ref:deletecomment)


__

* * *

---


### Chat

> 🔗 `https://developer.clickup.com/docs/chat`

##

Channels

Use the API to create, retrieve, update, or delete Channels.

> Note
>  The Chat API endpoints are experimental and subject to change at any time.

###

Endpoints

Use the following endpoints:

  * [Create Channels](ref:createchatchannel)
  * [Retrieve Channels](ref:getchatchannels)
  * [Create a Channel on a Space, Folder, or List](ref:createlocationchatchannel)
  * [Retrieve a single Channel](ref:getchatchannel)
  * [Update a Channel](ref:updatechatchannel)
  * [Delete a Channel](ref:deletechatchannel)
  * [Retrieve Channel Followers](ref:getchatchannelfollowers)
  * [Retrieve Channel members](ref:getchatchannelmembers)


##

Direct messages

Use the API to create new direct messages using the [Create a direct message](ref:createdirectmessagechatchannel) endpoint.

##

Messages

Use the API to create, retrieve, update, or delete Chat messages.

###

Endpoints

Use the following endpoints:

  * [Create a message](ref:createchatmessage)
  * [Retrieve Channel messages](ref:getchatmessages)
  * [Update a message](ref:patchchatmessage)
  * [Delete a message](ref:deletechatmessage)


##

Message reactions

Use the API to create, retrieve, or delete Chat message reactions.

###

Endpoints

Use the following endpoints:

  * [Create a message reaction](ref:createchatreaction)
  * [Retrieve message reactions](ref:getchatmessagereactions)
  * [Delete a message reaction](ref:deletechatreaction)


##

Replies

Use the API to create or retrieve replies in Chat.

###

Endpoints

  * [Create a reply message](ref:createreplymessage)
  * [Retrieve replies to a message](ref:getchatmessagereplies)


##

Users

Use the API to retrieve @mentioned users using the [Retrieve @mentioned users](ref:getchatmessagetaggedusers) endpoint.

__

* * *

---


### Comment formatting

> 🔗 `https://developer.clickup.com/docs/comment-formatting`

#

Format text and use emoji in Comments

You can add and update comments using text formatting and emoji.

##

Plain text

You can also use `"comment_text": "This is a comment"` if you are simply adding a plain text comment, as shown in the example below.

JSON


    {
      "comment": [
        {
          "text": "plain text",
          "attributes": {}
        }
      ]
    }

##

Bold text

Use bold text.

JSON


    {
      "comment": [
        {
        "text": "bold text",
        "attributes": {
          "bold": true
          }
        }
      ]
    }

##

Italicized text

Use text with italics.

JSON


    {
      "comment": [
        {
        "text": "italics",
        "attributes": {
          "italic": true
          }
        }
      ]
    }

##

Inline code

Use inline code formatting.

JSON


    {
      "comment": [
      {
        "text": "inline code",
        "attributes": {
          "code": true
          }
        }
      ]
    }

##

Code block

Create a code block.

JSON


    {
      "comment": [
        {
        "text": "code block",
        "attributes": {}
        },
        {
        "text": "\n",
        "attributes":
          {
          "code-block": {
            "code-block": "plain"
            }
          }
        }
      ]
    }

##

Bulleted list

Create an unordered list.

JSON


    {
      "comment": [
        {
        "text": "bulleted list",
        "attributes": {}
        },
        {
        "text":"\n",
        "attributes":
          {
          "list": {
            "list": "bullet"
            }
          }
        }
      ]
    }

##

Numbered list

Create an ordered list.

JSON


    {
    "comment": [
      {
      "text": "numbered list",
      "attributes": {}
      },
        {
        "text":"\n",
        "attributes":
          {
          "list": {
            "list": "ordered"
            }
          }
        }
      ]
    }

##

Checklist

Create a checklist with checked and unchecked items.

JSON


    {
      "comment": [
        {
        "text": "Checklist",
        "attributes": {}
        },
        {
        "text": "\n",
        "attributes": {
          "list": {
            "list": "unchecked"
            }
          }
        },
        {
        "text": "Checked item",
        "attributes": {}
        },
        {
        "text": "\n",
        "attributes": {
          "list": {
            "list": "checked"
            }
          }
        }
      ]
    }

##

Toggle list

Create a toggle list of items behind a collapsed line of text.

JSON


    {
      "comment": [
        {
        "text": "Toggle list heading",
        "attributes": {}
        },
        {
        "text": "\n",
        "attributes": {
          "list": {
            "list": "toggled"
            }
          }
        },
        {
        "text": "Item in a toggle list",
        "attributes": {}
        },
        {
        "text": "\n",
        "attributes": {
         	"list": {
            "list": "none"
          },
          "indent": 1
          }
        }
      ]
    }

##

Emoji

The `code` property must be a valid Unicode emoji value, often written like `U+1f60a`. Please omit the `U+` and only pass the hex value of the code as a string.

JSON


    {
      "comment":
      [
        {
        "text": "U0001F60A",
        "type": "emoticon",
        "emoticon":
          {
          "code": "1f60a"
          }
        }
      ]
    }

##

Tag people in task comments

You can tag people in task comments (also known as @mentions) by including a tag with the person's ClickUp user ID. You can include more than one tag per request, and add text before and after the tag.

:::success Tip
You can use the [Get Authorized Teams](ref:getauthorizedteams) endpoint to find the user ID of the person you want to tag.
:::

JSON


    {
        "comment": [
            {
            "text": "I need someone to look at this comment. Maybe "
            },
            {
            "type": "tag",
            "user": {
                "id": 1234567
                }
            },
            {
            "text": " if you have time to check this out. Thanks!"
            }
        ]
    }

##

Add hyperlinks to task comments

You can add hyperlinks to comments.

JSON


    {
          "comment":[
          {
          "text": "Task comment content",
          "attributes": {
          "link":"https://clickup.com/api"}
            }
         ]
    }

__

* * *

---


### Task comments pagination

> 🔗 `https://developer.clickup.com/docs/task-comments-pagination`

[Get Task Comments](https://developer.clickup.com/reference/gettaskcomments#/) returns comments in reverse chronological order (**newest to oldest**).

By default, the request returns the 25 most recent comments.

You must use both the `start`(date) and `start_id`(comment ID) query parameters to request additional pages of task comments.

The "start" parameters tell ClickUp where to start looking for the next page of comments.

##

How to page through all available task comments

###

Call 1: GET `/task/{task_id}/comment`

**Returns:** Comments 1–25 (newest).

**Action:**

  1. Take the `id` and `date` from the last comment in the array.
  2. Insert them in the `start_id`and `start` query parameters of your next request.


###

Call 2: GET `/task/{task_id}/comment?start_id={id}&start={date}`

**Returns:** Comments 26–50 (next oldest).




__

* * *

---


## Docs


### Docs API limitation

> 🔗 `https://developer.clickup.com/docs/docsimportexportlimitations`

The Docs API has some formatting limitations compared to the product that are important to be aware of when [importing or exporting Docs.](ref:getpage)

#

Text

The following elements are supported by plain and markdown text when importing or exporting Docs.

Element| Plain and markdown text support
---|---
Normal text| Yes
Heading 1| Yes
Heading 2| Yes
Heading 3| Yes
Heading 4| Yes
Alignment| No
Bulleted List| Yes
Numbered List| Yes
Toggle List| No
Checklist| No
Banner| No
Code Block| Yes, but code formatting is lost
Quote| Yes

#

Inline

Inline elements are not supported by plain or markdown text when importing or exporting Docs.

#

Views

Views are not supported by plain and markdown text when importing or exporting Docs.

#

Embeds

The following embed elements are supported by plain and markdown text when importing or exporting Docs:

Element| Plain and markdown text support
---|---
YouTube| No
Vimeo| No
Loom| No
Miro| No
Giphy| No
Google Drive| No
Google Slides| No
Google Docs| No
Google Sheets| No
Attachment| Yes, but sizing is not retained
Embed a task| No
Embed a Doc| No
Embed a Whiteboard| No
Embed org chart| No

#

Formatting

The following formatting elements are supported by plain and markdown text when importing or exporting Docs:

Element| Plain and markdown text support
---|---
Bold| Yes
Italic| Yes
Underline| No
Strikethrough| Yes
Indent| No
Inline code| Yes
Website link| Yes

#

Advanced blocks

The following advanced block elements are supported by plain and markdown text when importing or exporting Docs:

Element| Plain and markdown text support
---|---
Synced content| No
Columns| No
Divider| Yes
Button| Yes, but it turns into an unformatted link
Table of contents| No
Table| Yes, but it loses formatting
Sticky table of contents| No
New slide| No

#

Text colors, background colors, and badges

Text colors, background colors, and badges are not supported by plain and markdown text when importing or exporting Docs.

#

Covers, icons, comments, page styles, and wikis

Covers, icons, comments, page styles, and wikis are not supported by plain and markdown text when importing or exporting Docs.

__

* * *

---


## Webhooks


### Webhooks

> 🔗 `https://developer.clickup.com/docs/webhooks`

#

Webhooks

Webhooks allow you to subscribe to events in your Workspace. You can create a webhook to subscribe to events from a specific location in your Workspace.

##

Webhooks Scope

Webhooks are created using the user's auth token and therefore are tied to the user.

If the user who created a webhook is disabled, the webhook remains but stops triggering. The system checks if the user is still part of the relevant hierarchy before triggering each webhook.

##

Security

ClickUp currently does not support dedicated IP addresses from which webhook events are sent.
Each webhook event is signed with a shared secret that is unique to the webhook and returned when the webhook is created. This guarantees that the event is coming from ClickUp. More under [Webhook Signature](doc:webhooksignature).

##

Registering a Webhook

Webhooks registrations are created using the [Create Webhook endpoint](ref:createwebhook). Each registration can be configured to subscribe to one or more events and a destination URL that ClickUp will send the event to. See more under _Receiving Webhook Events_ further down the page.

> 👍
>
> ###
>
> Tip
>
> Use a service like <https://smee.io/> to test webhooks easily.
>  You can use `*` as a wildcard to subscribe to all events.

The ClickUp API v2 example app shows how to [subscribe to webhooks](https://github.com/clickup/clickup-APIv2-demo/blob/1f81edcb9f8be36b2f0d13441ce7f3638b1defa1/backend/src/routes/clickup.ts#L77).

###

Locations Filters

You can create a webhook to subscribe to events from a specific location in your Workspace.

Only one location per Hierarchy level (Space, Folder, List, task) can be specified per webhook. The most specific location applies, so combining Space, Folder, List, or Task will subscribe to events for the lowest level of the Hierarchy.

The following example subscribes to events for the List:

JSON


    {
      "space_id": 1234,
      "list_id": 4567
    }

The following example subscribes to events for the task:

JSON


    {
      "space_id": 1234,
      "folder_id": 9876,
      "list_id": 4567,
      "task_id": "abc1234"
    }

##

Receiving Webhook Events

When an event your webhook is subscribed to occurs, ClickUp sends a `POST` request with event details to the URL you provided during webhook creation. If no protocol is specified, the default is `https`.

> 🚧
>
> ###
>
> Warning
>
> Non-SSL protocols may not be supported in the future. We recommend registering your webhook using `https`.

Requests follow these criteria:

  * Sent using the `POST` method.
  * `Content-Type` is always `application/json`.
  * Includes `webhook_id`, `event` name, and `resource ID` in the body.
  * If available, a `history_items` array will describe the event.
  * `before` and `after` are the values of the resource before and after the event.
  * Use `{{webhook_id}}:{{history_item_id}}` as an idempotency key.


###

Example Incoming Webhook Request


    POST https://yourdomain.com/webhook
    Content-Type: application/json

    Body:
    {
      "event": "listUpdated",
      "history_items": [
        {
          "id": "8a2f82db-7718-4fdb-9493-4849e67f009d",
          "type": 6,
          "date": "1642740510345",
          ...
          "source": null,
          "user": {
                "id": 183,
                "username": "John",
                ...
          },
          "before": "webhook payloads 2",
          "after": "Webhook payloads round 2"
        }
      ],
      "list_id": "162641285",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

See individual webhook payloads for more details or look at the ClickUp API v2 example app on how to [process incoming webhook requests](https://github.com/clickup/clickup-APIv2-demo/blob/1f81edcb9f8be36b2f0d13441ce7f3638b1defa1/backend/src/routes/webhook.ts#L177).

###

Webhook Response Typing Notes

  * `history_items[x].user.id` is an integer, not a string.
  * Unset boolean values (e.g., Custom Field checkmarks) may be `NULL` instead of `false`.
  * Custom Field values are not normalized; cast to the correct type as needed.


##

Webhook Events

###

Task webhooks

  * `taskCreated` \- Triggered when a new task is created.
  * `taskUpdated` \- Triggered when a task is updated. Adding an attachment to a task won't trigger the taskUpdated webhook, but uploading an attachment to a task comment will.
  * `taskDeleted` \- Triggered when a task is deleted.
  * `taskPriorityUpdated` \- Triggered when a task's priority is updated.
  * `taskStatusUpdated` \- Triggered when a task's status is updated.
  * `taskAssigneeUpdated` \- Triggered when an assignee is added or removed from a task.
  * `taskDueDateUpdated` \- Triggered when a task's due date is updated.
  * `taskTagUpdated` \- Triggered when a tag is added or removed from a task.
  * `taskMoved` \- Triggered when a task is moved to a new List.
  * `taskCommentPosted` \- Triggered when a comment is added to a task.
  * `taskCommentUpdated` \- Triggered when an existing comment on a task is updated.
  * `taskTimeEstimateUpdated` \- Triggered when a task's time estimate is added or updated.
  * `taskTimeTrackedUpdated` \- Triggered when time tracked on a task is added, updated, or deleted.


[View example task payloads](doc:webhooktaskpayloads)

###

List webhooks

  * `listCreated` \- Triggered when a new List is created.
  * `listUpdated` \- Triggered when an existing List is updated.
  * `listDeleted` \- Triggered when a List is deleted.


[View example List payloads](doc:webhooklistpayloads)

###

Folder webhooks

  * `folderCreated` \- Triggered when a new Folder is created.
  * `folderUpdated` \- Triggered when an existing Folder is updated.
  * `folderDeleted` \- Triggered when a Folder is deleted.


[View example Folder payloads](doc:webhookfolderpayloads)

###

Space webhooks

  * `spaceCreated` \- Triggered when a new Space is created.
  * `spaceUpdated` \- Triggered when an existing Space is updated.
  * `spaceDeleted` \- Triggered when a Space is deleted.


[View example Space payloads](doc:webhookspacepayloads)

###

Goal and Target (key result) webhooks

  * `goalCreated` \- Triggered when a new Goal is created.
  * `goalUpdated` \- Triggered when an existing Goal is updated.
  * `goalDeleted` \- Triggered when a Goal is deleted.
  * `keyResultCreated` \- Triggered when a new Target is created.
  * `keyResultUpdated` \- Triggered when an existing Target is updated.
  * `keyResultDeleted` \- Triggered when a Target is deleted.


[View example Goal and Target payloads](doc:webhookgoaltargetpayloads)

**Want to learn more?**

  * Check out [this guide](https://zapier.com/blog/what-are-webhooks/) from Zapier.
  * You can test webhooks in your browser using [webhook.site](https://webhook.site/).


__

* * *

---


### Webhook signature

> 🔗 `https://developer.clickup.com/docs/webhooksignature`

#

Webhook signature

All requests sent to your webhook endpoints are signed to ensure you can verify that the traffic is genuinely coming from ClickUp.

We use a hash-based message authentication code (HMAC) to sign requests.

When creating a webhook, the `webhook.secret` is returned in the response object. Each incoming webhook request to your server will use this secret to generate a signature.

This signature is included in the `X-Signature` HTTP header, allowing the client to verify it was created using the same secret.

> 👀
>
> ###
>
> Note
>
> Signatures are always digested in hexadecimal format.

##

Example webhook request

###

Header

https://yourdomain.com/webhook


    Content-Type: application/json
    X-Signature: f7bc83f430538424b13298e6aa6

###

Body

JSON


    {
        "webhook_id": "7689a169-a000-4985-8676-6902b96d6627",
        "event": "taskCreated",
        "task_id": "c0j"
    }

The `X-Signature` value in this example was created by hashing the request body using the provided secret and the SHA-256 algorithm.

To verify the signature, the client can generate a hash signature using the same algorithm and secret, and compare the values.

###

Example using **Node.js** :

Below is a Node.js example for verifying the signature. For examples in [other languages, see this repository](https://github.com/danharper/hmac-examples).

> 👀
>
> ###
>
> Note
>
> In this example, the body is already a string. If you are using an HTTP client that automatically parses request bodies, make sure to stringify the object without adding white spaces.

JavaScript


    const crypto = require('crypto');

    const key = 'secret'; // from the webhook object, stored in your DB
    const body = '{"webhook_id":"7689a169-a000-4985-8676-6902b96d6627","event":"taskCreated","task_id":"c0j"}';

    const hash = crypto.createHmac('sha256', key).update(body);
    const signature = hash.digest('hex');

See the [API v2 example app](https://github.com/clickup/clickup-APIv2-demo/blob/1f81edcb9f8be36b2f0d13441ce7f3638b1defa1/backend/src/routes/webhook.ts#L177) for a full example.

__

* * *

---


### Webhook health status

> 🔗 `https://developer.clickup.com/docs/webhookhealth`

#

Webhook health status

At ClickUp, we monitor the health of your webhooks to ensure optimal performance and resource usage.

As long as your endpoint responds with a successful HTTP status code in a timely manner, your webhook will remain active.

If issues arise, we’ll update your webhook to one of the statuses described below.

##

Active

When your webhook is healthy and returns successful HTTP status codes, we will continue sending subscribed events to the endpoint.

##

Failing

A webhook is marked as failing if it returns an unsuccessful HTTP status code or if a request takes longer than 7 seconds to complete.

To account for temporary issues, we will retry the webhook up to five times for each event. After five delivery attemptsfor an event, we increment a `fail_count`, and stop sending the failed event.
The `failt_count` can be monitored via API on the webhook object.

If your endpoint recovers and starts sending successful responses, the webhook will automatically return to the active state, and the `fail_count` will reset. Failed events will not be resent.

> 🚧
>
> ###
>
> Note
>
> Currently, no notification is sent when your webhook's health status changes.

Webhooks are immediately suspended when a `410` status code is received. Any other error will increase the `fail_count`.

##

Suspended

If the `fail_count` reaches 100, the webhook will be marked as suspended. We will stop sending events to that webhook.

To reactivate it, change the webhook’s status back to active using the `PUT /api/v2/webhook/{webhook_id}` request.

##

Suspend webhook via 401 status

Returning a `401` HTTP status code for a webhook will immediately mark it as suspended.

__

* * *

---


### Space webhook payloads

> 🔗 `https://developer.clickup.com/docs/webhookspacepayloads`

#

Space payloads

The following webhook example payloads are sent to your webhook URL when Spaces are created or updated.

##

spaceCreated payload

This webhook is triggered when a new Space is created. We also send the listCreated and spaceUpdated payloads as a List is automatically created in the new Space.

JSON


    {
      "event": "spaceCreated",
      "space_id": "54650507",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

Space created: listCreated payload

This is an example listCreated payload that was sent when a new Space was created.

JSON


    {
      "event": "listCreated",
      "list_id": "162641554",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

Space created: spaceUpdated payload

This is an example spaceUpdated payload that was sent when a new Space was created.

JSON


    {
      "event": "spaceUpdated",
      "space_id": "54650507",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

spaceUpdated payload

This webhook is triggered when a Space is updated. This example was sent when a Space was renamed.

JSON


    {
      "event": "spaceUpdated",
      "space_id": "54650507",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

spaceDeleted payload

This webhook is triggered when a Space is deleted. We also send listDeleted payloads for any Lists deleted with the Space.

JSON


    {
      "event": "spaceDeleted",
      "space_id": "54650507",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

Space deleted: listDeleted payload

Here is an example listDeleted payload that was sent when a Space was deleted.

JSON


    {
      "event": "listDeleted",
      "list_id": "162641554",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

__

* * *

---


### Folder webhook payloads

> 🔗 `https://developer.clickup.com/docs/webhookfolderpayloads`

#

Folder payloads

The following webhook example payloads are sent to your webhook URL when Folders are created or updated.

##

folderCreated payload

This webhook is triggered when a new Folder is created. We also send the spaceUpdated payload.

JSON


    {
      "event": "folderCreated",
      "folder_id": "96772212",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

Folder created: spaceUpdated payload

Here is an example spaceUpdated payload that was sent when a new Folder was created.

JSON


    {
      "event": "spaceUpdated",
      "space_id": "7002367",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

folderUpdated payload

This webhook is triggered when a Folder is updated. This example was sent when a Folder was renamed.

JSON


    {
      "event": "folderUpdated",
      "folder_id": "96772212",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

folderDeleted payload

This webhook is triggered when a Folder is deleted. We also send the spaceUpdated and listDeleted payloads.

JSON


    {
      "event": "folderDeleted",
      "folder_id": "96772212",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

Folder deleted: spaceUpdated payload

This is an example spaceUpdated payload that was sent when a Folder was deleted.

JSON


    {
      "event": "spaceUpdated",
      "space_id": "7002367",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

Folder deleted: listDeleted payload

This is an example listDeleted payload that was sent when a Folder was deleted.

JSON


    {
      "event": "listDeleted",
      "list_id": "162641543",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

__

* * *

---


### List webhook payloads

> 🔗 `https://developer.clickup.com/docs/webhooklistpayloads`

#

List payloads

The following webhook example payloads are sent to your webhook URL when Lists are created or updated.

##

history_items

The history_items section includes metadata about the event that triggered the webhook.

  * `date`: The date and time when the event ocurred, displayed in Unix time in milliseconds.
  * `field`: The field on the List that was changed to trigger the webhook.
  * `user`: The user who performed the action that triggered the webhook.
  * `before`: The state of the List before the change that triggered the webhook.
  * `after`: The state of the List after the change that triggered the webhook.


##

listCreated payload

This webhook is triggered when a new List is created in your Workspace. We also send the spaceUpdated for the Space where the new List is created.

JSON


    {
      "event": "listCreated",
      "list_id": "162641234",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

List Created: spaceUpdated payload

Here is an example spaceUpdated payload that was sent when a new List was created.

JSON


    {
      "event": "spaceUpdated",
      "space_id": "7002367",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

listUpdated payload

This webhook is triggered when a List is updated. The below example was sent when a List was renamed.

JSON


    {
      "event": "listUpdated",
      "history_items": [
        {
          "id": "8a2f82db-7718-4fdb-9493-4849e67f009d",
          "type": 6,
          "date": "1642740510345",
          "field": "name",
          "parent_id": "162641285",
          "data": {},
          "source": null,
          "user": {
                "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
          },
          "before": "webhook payloads 2",
          "after": "Webhook payloads round 2"
        }
      ],
      "list_id": "162641285",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

listDeleted payload

This webhook is triggered when a List is deleted.

JSON


    {
      "event": "listDeleted",
      "list_id": "162641062",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

__

* * *

---


### Task webhook payloads

> 🔗 `https://developer.clickup.com/docs/webhooktaskpayloads`

#

Task payloads

The following webhook example payloads are sent to your webhook URL when tasks are created or updated.

##

history_items

The history_items section includes metadata about the event that triggered the webhook.

  * `date`: The date and time when the event ocurred, displayed in Unix time in milliseconds.
  * `field`: The field on the task that triggered the webhook.
  * `user`: The user who performed the action that triggered the webhook.
  * `before`: The state of the task before the change that triggered the webhook.
  * `after`: The state of the task after the change that triggered the webhook.


##

taskCreated payload

This webhook is triggered when a new task is created. We also send the `taskStatusUpdated` payload when a new task is created. The `parent_id` refers to the List ID where the new task was created.

JSON


    {
      "event": "taskCreated",
      "history_items": [
        {
          "id": "2800763136717140857",
          "type": 1,
          "date": "1642734631523",
          "field": "status",
          "parent_id": "162641062",
          "data": {
            "status_type": "open"
          },
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "before": {
            "status": null,
            "color": "#000000",
            "type": "removed",
            "orderindex": -1
          },
          "after": {
            "status": "to do",
            "color": "#f9d900",
            "orderindex": 0,
            "type": "open"
          }
        },
        {
          "id": "2800763136700363640",
          "type": 1,
          "date": "1642734631523",
          "field": "task_creation",
          "parent_id": "162641062",
          "data": {},
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "before": null,
          "after": null
        }
      ],
      "task_id": "1vj37mc",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

New task: TaskStatusUpdated payload

Here is an example taskStatusUpdated payload that was sent when a new task was created:

JSON


    {
      "event": "taskStatusUpdated",
      "history_items": [
        {
          "id": "2800763136717140857",
          "type": 1,
          "date": "1642734631523",
          "field": "status",
          "parent_id": "162641062",
          "data": {
            "status_type": "open"
          },
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "before": {
            "status": null,
            "color": "#000000",
            "type": "removed",
            "orderindex": -1
          },
          "after": {
            "status": "to do",
            "color": "#f9d900",
            "orderindex": 0,
            "type": "open"
          }
        }
      ],
      "task_id": "1vj37mc",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

taskUpdated payload

This webhook is triggered when a task is updated. This example payload was sent when a task description was added to the task.

JSON


    {
      "event": "taskUpdated",
      "history_items": [
        {
          "id": "2800768061568222238",
          "type": 1,
          "date": "1642734925064",
          "field": "content",
          "parent_id": "162641062",
          "data": {},
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "before": null,
          "after": "{\"ops\":[{\"insert\":\"This is a task description update to trigger the \"},{\"insert\":\"\\n\",\"attributes\":{\"block-id\":\"block-24d0457c-908f-412c-8267-da08f8dc93e4\"}}]}"
        }
      ],
      "task_id": "1vj37mc",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

taskUpdated: set Custom Field payload

Here is a taskUpdated payload that was sent when a Custom Field was set on a task.

JSON


    {
      "event": "taskUpdated",
      "history_items": [
        {
          "id": "2800771175285296851",
          "type": 1,
          "date": "1642735110657",
          "field": "custom_field",
          "parent_id": "162641062",
          "data": {},
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "before": null,
          "after": "5048f827-f16a-47b0-afec-5fd0e51b5f50",
          "custom_field": {
            "id": "862a38bb-eaba-4b9b-a4b5-c09d2a8c082f",
            "name": "Selection Dropdown",
            "type": "drop_down",
            "type_config": {
              "default": 0,
              "placeholder": null,
              "new_drop_down": true,
              "options": [
                {
                  "id": "5048f827-f16a-47b0-afec-5fd0e51b5f50",
                  "name": "Monthly",
                  "value": "Monthly",
                  "type": "text",
                  "color": null,
                  "orderindex": 0
                },
                {
                  "id": "5c69d237-f440-4498-ae46-3b3948db931b",
                  "name": "Quarterly",
                  "value": "Quarterly",
                  "type": "text",
                  "color": null,
                  "orderindex": 1
                },
                {
                  "id": "fc4b63d1-d4d5-45fc-bee5-3adef2b15dff",
                  "name": "Yearly",
                  "value": "Yearly",
                  "type": "text",
                  "color": null,
                  "orderindex": 2
                },
                {
                  "id": "8c7a4048-53fd-455a-82ba-ecf2a8a4c74d",
                  "name": "here's a really long long long drop down option with a long line of text",
                  "value": "here's a really long long long drop down option with a long line of text",
                  "type": "text",
                  "color": null,
                  "orderindex": 3
                }
              ]
            },
            "values_set": null,
            "userid": "2770032",
            "date_created": "1611729648993",
            "hide_from_guests": false,
            "team_id": "6931406",
            "deleted": false,
            "deleted_by": null,
            "pinned": true,
            "required": false,
            "required_on_subtasks": false,
            "linked_subcategory": null
          }
        }
      ],
      "task_id": "1vj37mc",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

taskDeleted payload

This webhook is triggered when a task is deleted.

JSON


    {
      "event": "taskDeleted",
      "task_id": "1vj37mc",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

taskPriorityUpdated payload

This webhook is triggered when a task's Priority is set or updated. We also send the taskUpdated payload.

JSON


    {
      "event": "taskPriorityUpdated",
      "history_items": [
        {
          "id": "2800773800802162647",
          "type": 1,
          "date": "1642735267148",
          "field": "priority",
          "parent_id": "162641062",
          "data": {},
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "before": null,
          "after": {
            "id": "2",
            "priority": "high",
            "color": "#ffcc00",
            "orderindex": "2"
          }
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

Priority updated: taskUpdated payload

Here is an example taskUpdated payload that was sent when a task's Priority was set.

JSON


    {
      "event": "taskUpdated",
      "history_items": [
        {
          "id": "2800773800802162647",
          "type": 1,
          "date": "1642735267148",
          "field": "priority",
          "parent_id": "162641062",
          "data": {},
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "before": null,
          "after": {
            "id": "2",
            "priority": "high",
            "color": "#ffcc00",
            "orderindex": "2"
          }
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

taskStatusUpdated payload

This webhook is triggered when a task's Status is updated. We also send the taskUpdated payload.

JSON


    {
      "event": "taskStatusUpdated",
      "history_items": [
        {
          "id": "2800787326392370170",
          "type": 1,
          "date": "1642736073330",
          "field": "status",
          "parent_id": "162641062",
          "data": {
            "status_type": "custom"
          },
          "source": null,
          "user": {
                "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
          },
          "before": {
            "status": "to do",
            "color": "#f9d900",
            "orderindex": 0,
            "type": "open"
          },
          "after": {
            "status": "in progress",
            "color": "#7C4DFF",
            "orderindex": 1,
            "type": "custom"
          }
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

Task status updated: taskUpdated payload

Here is an example taskUpdated payload that was sent when a task's Status was updated.

JSON


    {
      "event": "taskUpdated",
      "history_items": [
        {
          "id": "2800787326392370170",
          "type": 1,
          "date": "1642736073330",
          "field": "status",
          "parent_id": "162641062",
          "data": {
            "status_type": "custom"
          },
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "before": {
            "status": "to do",
            "color": "#f9d900",
            "orderindex": 0,
            "type": "open"
          },
          "after": {
            "status": "in progress",
            "color": "#7C4DFF",
            "orderindex": 1,
            "type": "custom"
          }
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

taskAssigneeUpdated payload

This webhook is triggered when a task's assignee is set or updated. We also send the taskUpdated payload.

JSON


    {
      "event": "taskAssigneeUpdated",
      "history_items": [
        {
          "id": "2800789353868594308",
          "type": 1,
          "date": "1642736194135",
          "field": "assignee_add",
          "parent_id": "162641062",
          "data": {},
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "after": {
            "id": 184,
            "username": "Sam",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "S",
            "profilePicture": null
          }
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

Assignee updated: taskUpdated payload

Here is an example taskUpdated payload that was sent when a task's Assignee was updated.

JSON


    {
      "event": "taskUpdated",
      "history_items": [
        {
          "id": "2800789353868594308",
          "type": 1,
          "date": "1642736194135",
          "field": "assignee_add",
          "parent_id": "162641062",
          "data": {},
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "after": {
            "id": 184,
            "username": "Sam",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "S",
            "profilePicture": null
          }
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

taskDueDateUpdated payload

This webhook is triggered when a task's due date is set or updated. We also send the taskUpdated payload.

JSON


    {
      "event": "taskDueDateUpdated",
      "history_items": [
        {
          "id": "2800792714143635886",
          "type": 1,
          "date": "1642736394447",
          "field": "due_date",
          "parent_id": "162641062",
          "data": {
            "due_date_time": true,
            "old_due_date_time": false
          },
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "before": "1642701600000",
          "after": "1643608800000"
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

Due date updated: taskUpdated payload

Here is an example taskUpdated payload that was sent when a task's due date was updated.{

JSON


    {
      "event": "taskUpdated",
      "history_items": [
        {
          "id": "2800792714143635886",
          "type": 1,
          "date": "1642736394447",
          "field": "due_date",
          "parent_id": "162641062",
          "data": {
            "due_date_time": true,
            "old_due_date_time": false
          },
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "before": "1642701600000",
          "after": "1643608800000"
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

taskTagUpdated payload

This webhook is triggered when task Tags are added or removed. We also send the taskUpdated payload.

JSON


    {
      "event": "taskTagUpdated",
      "history_items": [
        {
          "id": "2800797048554170804",
          "type": 1,
          "date": "1642736652800",
          "field": "tag",
          "parent_id": "162641062",
          "data": {},
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "before": null,
          "after": [
            {
              "name": "def",
              "tag_fg": "#FF4081",
              "tag_bg": "#FF4081",
              "creator": 2770032
            }
          ]
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

Task tags updated: taskUpdated payload

Here is an example taskUpdated payload sent when a task's Tags was updated.

JSON


    {
      "event": "taskUpdated",
      "history_items": [
        {
          "id": "2800797048554170804",
          "type": 1,
          "date": "1642736652800",
          "field": "tag",
          "parent_id": "162641062",
          "data": {},
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "before": null,
          "after": [
            {
              "name": "def",
              "tag_fg": "#FF4081",
              "tag_bg": "#FF4081",
              "creator": 2770032
            }
          ]
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

taskMoved payload

This webhook is triggered when a task is moved to a new List. We also send the taskUpdated and spaceUpdated payloads.

JSON


    {
      "event": "taskMoved",
      "history_items": [
        {
          "id": "2800800851630274181",
          "type": 1,
          "date": "1642736879339",
          "field": "section_moved",
          "parent_id": "162641285",
          "data": {
            "mute_notifications": true
          },
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "before": {
            "id": "162641062",
            "name": "Webhook payloads",
            "category": {
              "id": "96771950",
              "name": "hidden",
              "hidden": true
            },
            "project": {
              "id": "7002367",
              "name": "This is my API Space"
            }
          },
          "after": {
            "id": "162641285",
            "name": "webhook payloads 2",
            "category": {
              "id": "96772049",
              "name": "hidden",
              "hidden": true
            },
            "project": {
              "id": "7002367",
              "name": "This is my API Space"
            }
          }
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

Task moved: taskUpdated payload

Here is an example taskUpdated payload that was sent when a task was moved to a new List.

JSON


    {
      "event": "taskUpdated",
      "history_items": [
        {
          "id": "2800800851630274181",
          "type": 1,
          "date": "1642736879339",
          "field": "section_moved",
          "parent_id": "162641285",
          "data": {
            "mute_notifications": true
          },
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "before": {
            "id": "162641062",
            "name": "Webhook payloads",
            "category": {
              "id": "96771950",
              "name": "hidden",
              "hidden": true
            },
            "project": {
              "id": "7002367",
              "name": "This is my API Space"
            }
          },
          "after": {
            "id": "162641285",
            "name": "webhook payloads 2",
            "category": {
              "id": "96772049",
              "name": "hidden",
              "hidden": true
            },
            "project": {
              "id": "7002367",
              "name": "This is my API Space"
            }
          }
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

Task moved: spaceUpdated payload

Here is an example spaceUpdated payload that was sent when a task was moved to a new List.

JSON


    {
      "event": "spaceUpdated",
      "space_id": "7002367",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

taskCommentPosted payload

This webhook is triggered when a new comment is posted on a task. We also send the taskUpdated payload.

JSON


    {
      "event": "taskCommentPosted",
      "history_items": [
        {
          "id": "2800803631413624919",
          "type": 1,
          "date": "1642737045116",
          "field": "comment",
          "parent_id": "162641285",
          "data": {},
          "source": null,
          "user": {
            "id": 183,
            "username": "John",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "color": "#7b68ee",
            "initials": "J",
            "profilePicture": null
          },
          "before": null,
          "after": "648893191",
          "comment": {
            "id": "648893191",
            "date": "1642737045116",
            "parent": "1vj38vv",
            "type": 1,
            "comment": [
              {
                "text": "comment abc1234",
                "attributes": {}
              },
              {
                "text": "\n",
                "attributes": {
                  "block-id": "block-4c8fe54f-7bff-4b7b-92a2-9142068983ea"
                }
              }
            ],
            "text_content": "comment abc1234\n",
            "x": null,
            "y": null,
            "image_y": null,
            "image_x": null,
            "page": null,
            "comment_number": null,
            "page_id": null,
            "page_name": null,
            "view_id": null,
            "view_name": null,
            "team": null,
            "user": {
                 "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
            },
            "new_thread_count": 0,
            "new_mentioned_thread_count": 0,
            "email_attachments": [],
            "threaded_users": [],
            "threaded_replies": 0,
            "threaded_assignees": 0,
            "threaded_assignees_members": [],
            "threaded_unresolved_count": 0,
            "thread_followers": [
              {
                "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
              }
            ],
            "group_thread_followers": [],
            "reactions": [],
            "emails": []
          }
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

Comment added: taskUpdated payload

Here's an example taskUpdated payload that was sent when a task comment was created:

JSON


    {
      "event": "taskUpdated",
      "history_items": [
        {
          "id": "2800803631413624919",
          "type": 1,
          "date": "1642737045116",
          "field": "comment",
          "parent_id": "162641285",
          "data": {},
          "source": null,
          "user": {
            "id": 2770032,
                "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
          },
          "before": null,
          "after": "648893191",
          "comment": {
            "id": "648893191",
            "date": "1642737045116",
            "parent": "1vj38vv",
            "type": 1,
            "comment": [
              {
                "text": "comment abc1234",
                "attributes": {}
              },
              {
                "text": "\n",
                "attributes": {
                  "block-id": "block-4c8fe54f-7bff-4b7b-92a2-9142068983ea"
                }
              }
            ],
            "text_content": "comment abc1234\n",
            "x": null,
            "y": null,
            "image_y": null,
            "image_x": null,
            "page": null,
            "comment_number": null,
            "page_id": null,
            "page_name": null,
            "view_id": null,
            "view_name": null,
            "team": null,
            "user": {
                "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
            },
            "new_thread_count": 0,
            "new_mentioned_thread_count": 0,
            "email_attachments": [],
            "threaded_users": [],
            "threaded_replies": 0,
            "threaded_assignees": 0,
            "threaded_assignees_members": [],
            "threaded_unresolved_count": 0,
            "thread_followers": [
              {
                "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
              }
            ],
            "group_thread_followers": [],
            "reactions": [],
            "emails": []
          }
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

taskCommentUpdated payload

This webhook is triggered when a task comment is edited. We also send the taskUpdated payload.

JSON


    {
      "event": "taskCommentUpdated",
      "history_items": [
        {
          "id": "2800803631413624919",
          "type": 1,
          "date": "1642737045116",
          "field": "comment",
          "parent_id": "162641285",
          "data": {},
          "source": null,
          "user": {
                "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
          },
          "before": null,
          "after": "648893191",
          "comment": {
            "id": "648893191",
            "date": "1642737045116",
            "parent": "1vj38vv",
            "type": 1,
            "comment": [
              {
                "text": "comment abc1234 56789",
                "attributes": {}
              },
              {
                "text": "\n",
                "attributes": {
                  "block-id": "block-4c8fe54f-7bff-4b7b-92a2-9142068983ea"
                }
              }
            ],
            "text_content": "comment abc1234 56789\n",
            "x": null,
            "y": null,
            "image_y": null,
            "image_x": null,
            "page": null,
            "comment_number": null,
            "page_id": null,
            "page_name": null,
            "view_id": null,
            "view_name": null,
            "team": null,
            "user": {
                "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
            },
            "new_thread_count": 0,
            "new_mentioned_thread_count": 0,
            "email_attachments": [],
            "threaded_users": [],
            "threaded_replies": 0,
            "threaded_assignees": 0,
            "threaded_assignees_members": [],
            "threaded_unresolved_count": 0,
            "thread_followers": [
              {
                "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
              }
            ],
            "group_thread_followers": [],
            "reactions": [],
            "emails": []
          }
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

Comment updated: taskUpdated payload

Here is an example taskUpdated payload that was sent when a task comment was updated.

JSON


    {
      "event": "taskUpdated",
      "history_items": [
        {
          "id": "2800803631413624919",
          "type": 1,
          "date": "1642737045116",
          "field": "comment",
          "parent_id": "162641285",
          "data": {},
          "source": null,
          "user": {
                "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
          },
          "before": null,
          "after": "648893191",
          "comment": {
            "id": "648893191",
            "date": "1642737045116",
            "parent": "1vj38vv",
            "type": 1,
            "comment": [
              {
                "text": "comment abc1234 56789",
                "attributes": {}
              },
              {
                "text": "\n",
                "attributes": {
                  "block-id": "block-4c8fe54f-7bff-4b7b-92a2-9142068983ea"
                }
              }
            ],
            "text_content": "comment abc1234 56789\n",
            "x": null,
            "y": null,
            "image_y": null,
            "image_x": null,
            "page": null,
            "comment_number": null,
            "page_id": null,
            "page_name": null,
            "view_id": null,
            "view_name": null,
            "team": null,
            "user": {
                "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
            },
            "new_thread_count": 0,
            "new_mentioned_thread_count": 0,
            "email_attachments": [],
            "threaded_users": [],
            "threaded_replies": 0,
            "threaded_assignees": 0,
            "threaded_assignees_members": [],
            "threaded_unresolved_count": 0,
            "thread_followers": [
              {
                "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
              }
            ],
            "group_thread_followers": [],
            "reactions": [],
            "emails": []
          }
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

taskTimeEstimateUpdated payload

This webhook is triggered when a time estimate is set or updated. We also send the taskUpdated payload.

JSON


    {
      "event": "taskTimeEstimateUpdated",
      "history_items": [
        {
          "id": "2800808904123520175",
          "type": 1,
          "date": "1642737359443",
          "field": "time_estimate",
          "parent_id": "162641285",
          "data": {
            "time_estimate_string": "1 hour 30 minutes",
            "old_time_estimate_string": null,
            "rolled_up_time_estimate": 5400000,
            "time_estimate": 5400000,
            "time_estimates_by_user": [
              {
                "userid": 2770032,
                "user_time_estimate": "5400000",
                "user_rollup_time_estimate": "5400000"
              }
            ]
          },
          "source": null,
          "user": {
                "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
          },
          "before": null,
          "after": "5400000"
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

Time estimated: taskUpdated payload

Here is an example taskUpdated payload that was sent when a task's Time Estimate was set.

JSON


    {
      "event": "taskTimeEstimateUpdated",
      "history_items": [
        {
          "id": "2800808904123520175",
          "type": 1,
          "date": "1642737359443",
          "field": "time_estimate",
          "parent_id": "162641285",
          "data": {
            "time_estimate_string": "1 hour 30 minutes",
            "old_time_estimate_string": null,
            "rolled_up_time_estimate": 5400000,
            "time_estimate": 5400000,
            "time_estimates_by_user": [
              {
                "userid": 2770032,
                "user_time_estimate": "5400000",
                "user_rollup_time_estimate": "5400000"
              }
            ]
          },
          "source": null,
          "user": {
                "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
          },
          "before": null,
          "after": "5400000"
        }
      ],
      "task_id": "1vj38vv",
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

##

taskTimeTrackedUpdated payload

This webhook is triggered when a time entry is added, updated, or deleted. We also send the taskUpdated payload.

JSON


    {
      "event": "taskTimeTrackedUpdated",
      "history_items": [
        {
          "id": "2800809188061123931",
          "type": 1,
          "date": "1642737376354",
          "field": "time_spent",
          "parent_id": "162641285",
          "data": {
            "total_time": "900000",
            "rollup_time": "900000"
          },
          "source": null,
          "user": {
                "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
          },
          "before": null,
          "after": {
            "id": "2800809188061119507",
            "start": "1642736476215",
            "end": "1642737376215",
            "time": "900000",
            "source": "clickup",
            "date_added": "1642737376354"
          }
        }
      ],
      "task_id": "1vj38vv",
      "data": {
        "description": "Time Tracking Created",
        "interval_id": "2800809188061119507"
      },
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

###

Time tracked: taskUpdated payload

Here is an example taskUpdated payload that was sent when a time entry was added to a task.

JSON


    {
      "event": "taskUpdated",
      "history_items": [
        {
          "id": "2800809188061123931",
          "type": 1,
          "date": "1642737376354",
          "field": "time_spent",
          "parent_id": "162641285",
          "data": {
            "total_time": "900000",
            "rollup_time": "900000"
          },
          "source": null,
          "user": {
                "id": 183,
                "username": "John",
                "email": "[[email protected]](/cdn-cgi/l/email-protection)",
                "color": "#7b68ee",
                "initials": "J",
                "profilePicture": null
          },
          "before": null,
          "after": {
            "id": "2800809188061119507",
            "start": "1642736476215",
            "end": "1642737376215",
            "time": "900000",
            "source": "clickup",
            "date_added": "1642737376354"
          }
        }
      ],
      "task_id": "1vj38vv",
      "data": {
        "description": "Time Tracking Created",
        "interval_id": "2800809188061119507"
      },
      "webhook_id": "7fa3ec74-69a8-4530-a251-8a13730bd204"
    }

__

* * *

---


### Automation Call webhook payload

> 🔗 `https://developer.clickup.com/docs/automationwebhookpayload`

#

Automation webhook payloads

The following webhook example payload is sent to your webhook URL when the [Call webhook Action](https://help.clickup.com/hc/en-us/articles/31126817112343-Create-a-task-webhook-Automation) is used in an Automation.

##

automationCreated payload

This webhook is triggered when the Call webhook Action is used in an Automation.

JSON


    {
      "auto_id": "c389706e-3a5f-4230-a2aa-cdea3dc1e4cc:main",
      "trigger_id": "40dd6192-91d7-4f3e-b55f-605297c77bb7",
      "date": "2025-04-16T23:49:06.457Z",
      "payload": {
        "id": "868djdyr0",
        "name": "HookMe!",
        "content": "{\"ops\":[{\"insert\":\"\\n\",\"attributes\":{\"block-id\":\"block-5569f3f6-74bd-4320-a736-795368e860ce\"}}]}",
        "lower_text_content": null,
        "lower_name": "hookme!",
        "html_content": null,
        "text_content": "",
        "content_size": "none",
        "sprint_points": null,
        "coverimage": null,
        "priority": null,
        "personal_priority": [],
        "draft_uuid": null,
        "custom_id": null,
        "custom_type": null,
        "status_id": "p90113664978_MfslpaDU",
        "workspace_id": "36226098",
        "subcategory": "901110236848",
        "direct_parent": null,
        "root_parent": null,
        "merged_to": null,
        "subtask_sort": null,
        "subtask_sort_dir": null,
        "reccurence": {
          "v1": {
            "recurring": false,
            "recur_type": null,
            "recur_next": null,
            "recur_new_status": null,
            "recur_due_date": null,
            "recur_data": null,
            "recur_rule": null,
            "recur_task": null,
            "recur_skip_missed": false,
            "recur_on_status": null,
            "recur_on": null,
            "recur_copy_original": false,
            "recur_time": false,
            "recur_immediately": false,
            "recur_until": null,
            "recur_dst": null,
            "recur_tz_offset": null,
            "recur_tz": null,
            "recur_daily": false,
            "recur_ignore_today": false
          },
          "v2": {
            "set_time": false,
            "create_new_task": false,
            "periodically": false,
            "simple_settings": false,
            "ignore_weekends": false,
            "recur_on_schedule": false
          }
        },
        "privacy": {
          "private": false,
          "public": false,
          "public_token": null,
          "public_permission_level": null,
          "public_fields": null,
          "public_share_expires_on": null,
          "public_sharing": false,
          "seo_optimized": false,
          "made_public_by": null,
          "made_public_time": null
        },
        "templating": {
          "template": false,
          "original_subcat": null,
          "template_name": null,
          "team_id": null,
          "template_field_ids": null,
          "permanent_template_id": null,
          "visibility": null
        },
        "states": {
          "is_archived": false,
          "is_deleted": false,
          "is_encrypted": false
        },
        "time_mgmt": {
          "is_summary_task": false,
          "start_date": null,
          "start_date_time": false,
          "date_closed": null,
          "date_created": "1744847344168",
          "date_updated": "1744847344168",
          "due_date": null,
          "due_date_time": false,
          "date_deleted": null,
          "date_active": null,
          "date_unstarted": null,
          "date_done": null,
          "date_delegated": null,
          "time_estimate": null,
          "time_estimate_string": null,
          "time_spent": null,
          "sent_due_date_notif": false,
          "duration": {},
          "duration_is_elapsed": false
        },
        "checklists": [],
        "ownership": {
          "created_by_email": null,
          "owner": 54098740,
          "creator": 54098740,
          "deleted_by": null,
          "source": "user",
          "delegator": null,
          "form_id": null,
          "merged_to": null
        },
        "subtask_ids": [],
        "tags": [],
        "fields": [],
        "lists": [
          {
            "list_id": "901110236848",
            "type": "home"
          }
        ],
        "users": [
          {
            "userid": 54098740,
            "type": "watcher"
          },
          {
            "userid": 54098740,
            "type": "owner"
          },
          {
            "userid": 54098740,
            "type": "creator"
          }
        ],
        "groups": [],
        "related_tasks": [],
        "related_tasks_count": {
          "dependsOn": 0,
          "dependedBy": 0
        },
        "attachments": [],
        "docs": [],
        "_version_vector": {
          "workspace_id": 36226098,
          "object_type": "task",
          "object_id": "868djdyr0",
          "vector": [
            {
              "master_id": 11,
              "version": 1744847344213000,
              "deleted": false
            }
          ]
        }
      }
    }

__

* * *

---


### Goal and Target webhook payloads

> 🔗 `https://developer.clickup.com/docs/webhookgoaltargetpayloads`

#

Goal payloads

The following webhook example payloads are sent to your webhook URL when Goals are created or updated.

##

goalCreated payload

This webhook is triggered when a Goal is created.

JSON


    {
      "event": "goalCreated",
      "goal_id": "a23e5a3d-74b5-44c2-ab53-917ebe85045a",
      "webhook_id": "d5eddb2d-db2b-49e9-87d4-bc6cfbe2313b"
    }

##

goalUpdated payload

This webhook is triggered when a Goal is updated.

JSON


    {
      "event": "goalUpdated",
      "goal_id": "a23e5a3d-74b5-44c2-ab53-917ebe85045a",
      "webhook_id": "d5eddb2d-db2b-49e9-87d4-bc6cfbe2313b"
    }

##

goalDeleted payload

This webhook is triggered when a Goal is deleted.

JSON


    {
      "event": "goalDeleted",
      "goal_id": "a23e5a3d-74b5-44c2-ab53-917ebe85045a",
      "webhook_id": "d5eddb2d-db2b-49e9-87d4-bc6cfbe2313b"
    }

#

Target (key result) payloads

The following webhook example payloads are sent to your webhook URL when Goal Targets (key results) are created or updated.

##

keyResultCreated payload

This webhook is triggered when a Target of a Goal is created.

JSON


    {
      "event": "keyResultCreated",
      "goal_id": "a23e5a3d-74b5-44c2-ab53-917ebe85045a",
      "key_result_id": "47608e42-ad0e-4934-a39e-950539c77e79",
      "webhook_id": "d5eddb2d-db2b-49e9-87d4-bc6cfbe2313b"
    }

##

keyResultUpdated payload

This webhook is triggered when a Target of a Goal is updated.

JSON


    {
      "event": "keyResultUpdated",
      "goal_id": "a23e5a3d-74b5-44c2-ab53-917ebe85045a",
      "key_result_id": "47608e42-ad0e-4934-a39e-950539c77e79",
      "webhook_id": "d5eddb2d-db2b-49e9-87d4-bc6cfbe2313b"
    }

##

keyResultDeleted payload

This webhook is triggered when a Target of a Goal is deleted.

JSON


    {
      "event": "keyResultDeleted",
      "goal_id": "a23e5a3d-74b5-44c2-ab53-917ebe85045a",
      "key_result_id": "47608e42-ad0e-4934-a39e-950539c77e79",
      "webhook_id": "d5eddb2d-db2b-49e9-87d4-bc6cfbe2313b"
    }

__

* * *

---


### Automation Call webhook Legacy payload

> 🔗 `https://developer.clickup.com/docs/automationcallwebhooklegacypayload`

#

Automation legacy webhook payloads

The following webhook example payload is sent to your webhook URL when the [Call webhook (Legacy) Action](https://help.clickup.com/hc/en-us/articles/31126817112343-Create-a-task-webhook-Automation) is used in an Automation.

##

automationCreated payload

This webhook is triggered when the Call webhook (Legacy) Action is used in an Automation.

JSON


    {
      "id": "b4ced072-ae72-4c70-b898-fea5dd142408:main",
      "trigger_id": "6f612d16-9ff7-4db2-a2f6-19528ee3b90c",
      "date": "2024-01-11T19:40:17.927Z",
      "payload": {
        "id": "8687096vn",
        "custom_id": "DEF-43",
        "custom_item_id": 0,
        "name": "task name",
        "text_content": "",
        "description": "",
        "status": {
          "id": "p90090203753_p54073272_p54073128_p54071092_p54067915_r9V2QX7O",
          "status": "complete",
          "color": "#008844",
          "orderindex": 1,
          "type": "closed"
        },
        "orderindex": "39906954.00000000000000000000000000000000",
        "date_created": "1705002014968",
        "date_updated": "1705002016108",
        "date_closed": "1705002016108",
        "date_done": "1705002016108",
        "archived": false,
        "creator": {
          "id": 26191384,
          "username": "John",
          "color": "#5f7c8a",
          "email": "[[email protected]](/cdn-cgi/l/email-protection)",
          "profilePicture": "https://attachments.clickup.com/profilePictures/26191384_HoB.jpg"
        },
        "assignees": [],
        "watchers": [
          {
            "id": 26191384,
            "username": "John",
            "color": "#5f7c8a",
            "initials": "J",
            "email": "[[email protected]](/cdn-cgi/l/email-protection)",
            "profilePicture": "https://attachments.clickup.com/profilePictures/26191384_HoB.jpg"
          }
        ],
        "checklists": [],
        "tags": [],
        "parent": null,
        "priority": null,
        "due_date": null,
        "start_date": null,
        "points": null,
        "time_estimate": null,
        "time_spent": 0,
        "custom_fields": [
          {
            "id": "ede917d5-4dbb-46eb-9f7c-5d4f0a652b1f",
            "name": "ijjb",
            "type": "formula",
            "type_config": {
              "version": "1.6",
              "is_dynamic": false,
              "return_types": [
                "null"
              ],
              "calculation_state": "ready"
            },
            "date_created": "1698260411360",
            "hide_from_guests": false,
            "required": false
          },
          {
            "id": "7d979288-84e1-48b0-abaf-238ecb27e0fa",
            "name": "formula 1",
            "type": "currency",
            "type_config": {
              "default": null,
              "precision": 2,
              "currency_type": "USD"
            },
            "date_created": "1694298925344",
            "hide_from_guests": false,
            "required": false
          },
          {
            "id": "89bbdeeb-6724-4ec0-a8a7-c21d944199a7",
            "name": "Marketing Task Type",
            "type": "drop_down",
            "type_config": {
              "default": 0,
              "placeholder": null,
              "options": [
                {
                  "id": "d73a55af-88f5-4161-a948-7341d2bbb045",
                  "name": "Campaign",
                  "color": null,
                  "orderindex": 0
                },
                {
                  "id": "0010111d-91da-4cb7-8cc1-d642f90ef194",
                  "name": "asd",
                  "color": null,
                  "orderindex": 1
                }
              ]
            },
            "date_created": "1698177406311",
            "hide_from_guests": false,
            "required": false
          },
          {
            "id": "07119fd9-e1eb-4457-bc69-3e5913707ca2",
            "name": "files",
            "type": "attachment",
            "type_config": {},
            "date_created": "1700237528128",
            "hide_from_guests": false,
            "required": false
          },
          {
            "id": "60392065-eb67-40c3-afe2-10f288d0695d",
            "name": "new field",
            "type": "currency",
            "type_config": {
              "precision": 2,
              "currency_type": "EUR"
            },
            "date_created": "1696603471462",
            "hide_from_guests": true,
            "required": false
          }
        ],
        "dependencies": [],
        "linked_tasks": [],
        "locations": [],
        "team_id": "36003581",
        "url": "https://app.clickup.com/t/8687096vn",
        "sharing": {
          "public": false,
          "public_share_expires_on": null,
          "public_fields": [
            "assignees",
            "priority",
            "due_date",
            "content",
            "comments",
            "attachments",
            "customFields",
            "subtasks",
            "tags",
            "checklists",
            "coverimage"
          ],
          "token": null,
          "seo_optimized": false
        },
        "list": {
          "id": "901102008938",
          "name": "List",
          "access": true
        },
        "project": {
          "id": "90110993233",
          "name": "test folder",
          "hidden": false,
          "access": true
        },
        "folder": {
          "id": "90110993233",
          "name": "test folder",
          "hidden": false,
          "access": true
        },
        "space": {
          "id": "90090203753"
        }
      }
    }

__

* * *

---


## FAQ


### Frequently asked questions

> 🔗 `https://developer.clickup.com/docs/faq`

#

FAQ

###

What is a `team`?

Team is the legacy term for what are now called Workspaces in ClickUp. [Teams](https://help.clickup.com/hc/en-us/articles/6326036524823-Create-user-groups-with-Teams) are groups of users in a Workspace.

For compatibility, the term `team` is still used in our API to refer to Workspaces. In our API documentation, `team_id` refers to the id of a Workspace, and `group_id` refers to the id of a Team (a group of users).

###

What `Content-Type` should I use?

When formatting your requests to ClickUp, please always use the content type `application/json`. Using form encoded data is not fully supported and can result in unexpected consequences.

###

How are projects and Folders related?

Projects is the legacy term for what are now called Folders in ClickUp.

###

Do OAuth access tokens expire?

OAuth access tokens do not expire at this time.

###

Is it possible to move a task between lists using the API?

It is not possible to move a task between lists at this time.

###

Will tasks created via API generate notifications?

Yes, any action performed through the public API will trigger all of the same notifications that would occur when using ClickUp.

###

How do I tell who has access to a particular task?

To get a list of team members that have access to a particular task or list, use the routes `GET /api/v2/task/{{task_id}}/member` and `GET /api/v2/list/{{list_id}}/member` under the "Members" section of this documentation.

###

How are subtasks represented in the API?

You can work with subtasks the same way you would update any task using the API.

To check if a task object is a subtask or not, locate the `parent` property. If this value is `null` then it is not a subtask, otherwise it will contain the task ID of the parent task.

####

Nested subtasks

Nested subtasks will include the task ID of their immediate parent in the `parent` property.

For example:

  * Top level task ID: 1234
    * Subtask ID: 4567 (**parent:** 1234)
      * Nested subtask ID: 9876 (**parent:** 4567)


####

View subtasks

To view subtasks, you can use the **subtasks** query parameter to include subtasks on th following endpoints:

  * [Get Task](ref:gettask)
  * [Get Tasks](ref:gettasks)
  * [Get Filtered Team Tasks](ref:getfilteredteamtasks)


####

Create a subtask

To create a subtask, use [Create Task](ref:createtask) and set the `parent` property in the body of the request.

####

Update or delete existing subtasks

You can update subtasks using [Update Task](ref:updatetask) and delete them using [Delete Task](ref:deletetask).

####

How are [User Roles](https://docs.clickup.com/en/articles/966936-user-roles) represented in the API?

User Roles are included in the `"role":` field, with a number corresponding to the User Role shown below.

1: Workspace owner
2: Admin
3: Member
4: Guest

####

What does order_index mean?

The `order_index` field represents the order of statuses, Lists, Folders, and Spaces as they are displayed in ClickUp.

Tasks and subtasks no longer use the `order_index` in ClickUp, although we still return the field via the public API.

__

* * *

---


### Common Errors

> 🔗 `https://developer.clickup.com/docs/common_errors`

#

Common errors

Unsuccesful requests will return an HTTP status code other than `200`. They'll include a JSON error message and error code.

##

Common errors

###

XMLHttpRequest from origin has been blocked by CORS policy

This error is displayed when you make requests directly from a local environment or frontend application, such as Javascript Axios or Fetch. You can create a proxy script using any server-side language and then use Javascript to send requests.

###

Rate limit reached

`HTTP status code 429`

The API is [rate limited](doc:rate-limits) per OAuth and personal token.
You'll receive a `429 HTTP status code` response if you exceed the rate limit.

###

Team not authorized

`OAUTH_023`, `OAUTH_026`, `OAUTH_027`, and `OAUTH_029` to `OAUTH_045`

This error is thrown when a team (Workspace) was not authorized by the user for a particular access token.

###

Token not found

`OAUTH_019`, `OAUTH_021`, `OAUTH_025`, `OAUTH_077`

This error is thrown if authorization is [revoked by the user](doc:authentication#personal-token).

###

Authorization Header Required

`OAUTH_017`

The authorization token was missing in the **Authorization** header of the request.

###

Client Not Found

`OAUTH_010`

The client application was not created correctly.

####

Error code

###

Redirect URI not passed

`OAUTH_017`

The redirect URI was not present during the [OAuth authentication flow](doc:authentication#oauth-flow).

###

Redirect URI does not match the redirect uris of this application

`OAUTH_007`

The [redirect URI](doc:authentication#oauth-flow) must be registered with your client application.

###

Webhook configuration already exists

`OAUTH_171`

A webhook has already been created using this configuration and location.

__

* * *

---


# 📗 Parte 2: Referência da API (Endpoints)

> Todos os endpoints disponíveis na API v2 do ClickUp.

---


## Authorization


### Get Access Token

> 🔗 `https://developer.clickup.com/reference/getaccesstoken`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Authorized User

> 🔗 `https://developer.clickup.com/reference/getauthorizeduser`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Attachments


### Create Task Attachment

> 🔗 `https://developer.clickup.com/reference/createtaskattachment`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Comments


### Get Task Comments

> 🔗 `https://developer.clickup.com/reference/gettaskcomments`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Task Comment

> 🔗 `https://developer.clickup.com/reference/createtaskcomment`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Chat View Comments

> 🔗 `https://developer.clickup.com/reference/getchatviewcomments`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Chat View Comment

> 🔗 `https://developer.clickup.com/reference/createchatviewcomment`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get List Comments

> 🔗 `https://developer.clickup.com/reference/getlistcomments`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create List Comment

> 🔗 `https://developer.clickup.com/reference/createlistcomment`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Update Comment

> 🔗 `https://developer.clickup.com/reference/updatecomment`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete Comment

> 🔗 `https://developer.clickup.com/reference/deletecomment`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Threaded Comments

> 🔗 `https://developer.clickup.com/reference/getthreadedcomments`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Threaded Comment

> 🔗 `https://developer.clickup.com/reference/createthreadedcomment`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Custom Task Types


### Get Custom Task Types

> 🔗 `https://developer.clickup.com/reference/getcustomitems`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Custom Fields


### Get List Custom Fields

> 🔗 `https://developer.clickup.com/reference/getaccessiblecustomfields`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Folder Custom Fields

> 🔗 `https://developer.clickup.com/reference/getfolderavailablefields`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Space Custom Fields

> 🔗 `https://developer.clickup.com/reference/getspaceavailablefields`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Workspace Custom Fields

> 🔗 `https://developer.clickup.com/reference/getteamavailablefields`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Set Custom Field Value

> 🔗 `https://developer.clickup.com/reference/setcustomfieldvalue`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Remove Custom Field Value

> 🔗 `https://developer.clickup.com/reference/removecustomfieldvalue`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Folders


### Get Folders

> 🔗 `https://developer.clickup.com/reference/getfolders`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Folder

> 🔗 `https://developer.clickup.com/reference/createfolder`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Folder

> 🔗 `https://developer.clickup.com/reference/getfolder`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Update Folder

> 🔗 `https://developer.clickup.com/reference/updatefolder`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete Folder

> 🔗 `https://developer.clickup.com/reference/deletefolder`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Folder from template

> 🔗 `https://developer.clickup.com/reference/createfolderfromtemplate`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Goals


### Get Goals

> 🔗 `https://developer.clickup.com/reference/getgoals`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Goal

> 🔗 `https://developer.clickup.com/reference/creategoal`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Goal

> 🔗 `https://developer.clickup.com/reference/getgoal`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Update Goal

> 🔗 `https://developer.clickup.com/reference/updategoal`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete Goal

> 🔗 `https://developer.clickup.com/reference/deletegoal`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Key Result

> 🔗 `https://developer.clickup.com/reference/createkeyresult`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Edit Key Result

> 🔗 `https://developer.clickup.com/reference/editkeyresult`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete Key Result

> 🔗 `https://developer.clickup.com/reference/deletekeyresult`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Guests


### Invite Guest To Workspace

> 🔗 `https://developer.clickup.com/reference/inviteguesttoworkspace`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Guest

> 🔗 `https://developer.clickup.com/reference/getguest`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Edit Guest On Workspace

> 🔗 `https://developer.clickup.com/reference/editguestonworkspace`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Remove Guest From Workspace

> 🔗 `https://developer.clickup.com/reference/removeguestfromworkspace`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Add Guest To Task

> 🔗 `https://developer.clickup.com/reference/addguesttotask`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Remove Guest From Task

> 🔗 `https://developer.clickup.com/reference/removeguestfromtask`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Add Guest To List

> 🔗 `https://developer.clickup.com/reference/addguesttolist`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Remove Guest From List

> 🔗 `https://developer.clickup.com/reference/removeguestfromlist`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Add Guest To Folder

> 🔗 `https://developer.clickup.com/reference/addguesttofolder`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Remove Guest From Folder

> 🔗 `https://developer.clickup.com/reference/removeguestfromfolder`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Lists


### Get Lists

> 🔗 `https://developer.clickup.com/reference/getlists`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create List

> 🔗 `https://developer.clickup.com/reference/createlist`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Folderless Lists

> 🔗 `https://developer.clickup.com/reference/getfolderlesslists`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Folderless List

> 🔗 `https://developer.clickup.com/reference/createfolderlesslist`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get List

> 🔗 `https://developer.clickup.com/reference/getlist`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Update List

> 🔗 `https://developer.clickup.com/reference/updatelist`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete List

> 🔗 `https://developer.clickup.com/reference/deletelist`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Add Task To List

> 🔗 `https://developer.clickup.com/reference/addtasktolist`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Remove Task From List

> 🔗 `https://developer.clickup.com/reference/removetaskfromlist`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create List From Template in Folder

> 🔗 `https://developer.clickup.com/reference/createfolderlistfromtemplate`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create List From Template in Space.

> 🔗 `https://developer.clickup.com/reference/createspacelistfromtemplate`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Members


### Get Task Members

> 🔗 `https://developer.clickup.com/reference/gettaskmembers`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get List Members

> 🔗 `https://developer.clickup.com/reference/getlistmembers`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Roles


### Get Custom Roles

> 🔗 `https://developer.clickup.com/reference/getcustomroles`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Shared Hierarchy


### Shared Hierarchy

> 🔗 `https://developer.clickup.com/reference/sharedhierarchy`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Spaces


### Get Spaces

> 🔗 `https://developer.clickup.com/reference/getspaces`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Space

> 🔗 `https://developer.clickup.com/reference/createspace`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Space

> 🔗 `https://developer.clickup.com/reference/getspace`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Update Space

> 🔗 `https://developer.clickup.com/reference/updatespace`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete Space

> 🔗 `https://developer.clickup.com/reference/deletespace`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Tags


### Get Space Tags

> 🔗 `https://developer.clickup.com/reference/getspacetags`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Space Tag

> 🔗 `https://developer.clickup.com/reference/createspacetag`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Edit Space Tag

> 🔗 `https://developer.clickup.com/reference/editspacetag`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete Space Tag

> 🔗 `https://developer.clickup.com/reference/deletespacetag`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Add Tag To Task

> 🔗 `https://developer.clickup.com/reference/addtagtotask`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Remove Tag From Task

> 🔗 `https://developer.clickup.com/reference/removetagfromtask`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Tasks (API)


### Get Tasks

> 🔗 `https://developer.clickup.com/reference/gettasks`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Task

> 🔗 `https://developer.clickup.com/reference/createtask`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Task

> 🔗 `https://developer.clickup.com/reference/gettask`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Update Task

> 🔗 `https://developer.clickup.com/reference/updatetask`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete Task

> 🔗 `https://developer.clickup.com/reference/deletetask`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Filtered Team Tasks

> 🔗 `https://developer.clickup.com/reference/getfilteredteamtasks`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Merge Tasks

> 🔗 `https://developer.clickup.com/reference/mergetasks`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Task's Time in Status

> 🔗 `https://developer.clickup.com/reference/gettaskstimeinstatus`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Bulk Tasks' Time in Status

> 🔗 `https://developer.clickup.com/reference/getbulktaskstimeinstatus`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Task From Template

> 🔗 `https://developer.clickup.com/reference/createtaskfromtemplate`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Task Checklists


### Create Checklist

> 🔗 `https://developer.clickup.com/reference/createchecklist`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Edit Checklist

> 🔗 `https://developer.clickup.com/reference/editchecklist`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete Checklist

> 🔗 `https://developer.clickup.com/reference/deletechecklist`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Checklist Item

> 🔗 `https://developer.clickup.com/reference/createchecklistitem`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Edit Checklist Item

> 🔗 `https://developer.clickup.com/reference/editchecklistitem`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete Checklist Item

> 🔗 `https://developer.clickup.com/reference/deletechecklistitem`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Task Relationships


### Add Dependency

> 🔗 `https://developer.clickup.com/reference/adddependency`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete Dependency

> 🔗 `https://developer.clickup.com/reference/deletedependency`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Add Task Link

> 🔗 `https://developer.clickup.com/reference/addtasklink`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete Task Link

> 🔗 `https://developer.clickup.com/reference/deletetasklink`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Templates


### Get Task Templates

> 🔗 `https://developer.clickup.com/reference/gettasktemplates`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Workspaces


### Get Authorized Workspaces

> 🔗 `https://developer.clickup.com/reference/getauthorizedteams`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Workspace seats

> 🔗 `https://developer.clickup.com/reference/getworkspaceseats`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Workspace Plan

> 🔗 `https://developer.clickup.com/reference/getworkspaceplan`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## User Groups


### Create Group

> 🔗 `https://developer.clickup.com/reference/createusergroup`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Update Group

> 🔗 `https://developer.clickup.com/reference/updateteam`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete Group

> 🔗 `https://developer.clickup.com/reference/deleteteam`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Groups

> 🔗 `https://developer.clickup.com/reference/getteams1`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Time Tracking


### Get time entries within a date range

> 🔗 `https://developer.clickup.com/reference/gettimeentrieswithinadaterange`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create a time entry

> 🔗 `https://developer.clickup.com/reference/createatimeentry`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get singular time entry

> 🔗 `https://developer.clickup.com/reference/getsingulartimeentry`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete a time Entry

> 🔗 `https://developer.clickup.com/reference/deleteatimeentry`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Update a time Entry

> 🔗 `https://developer.clickup.com/reference/updateatimeentry`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get time entry history

> 🔗 `https://developer.clickup.com/reference/gettimeentryhistory`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get running time entry

> 🔗 `https://developer.clickup.com/reference/getrunningtimeentry`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Remove tags from time entries

> 🔗 `https://developer.clickup.com/reference/removetagsfromtimeentries`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get all tags from time entries

> 🔗 `https://developer.clickup.com/reference/getalltagsfromtimeentries`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Add tags from time entries

> 🔗 `https://developer.clickup.com/reference/addtagsfromtimeentries`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Change tag names from time entries

> 🔗 `https://developer.clickup.com/reference/changetagnamesfromtimeentries`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Start a time Entry

> 🔗 `https://developer.clickup.com/reference/startatimeentry`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Stop a time Entry

> 🔗 `https://developer.clickup.com/reference/stopatimeentry`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Time Tracking (Legacy)


### Get tracked time

> 🔗 `https://developer.clickup.com/reference/gettrackedtime`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Track time

> 🔗 `https://developer.clickup.com/reference/tracktime`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Edit time tracked

> 🔗 `https://developer.clickup.com/reference/edittimetracked`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete time tracked

> 🔗 `https://developer.clickup.com/reference/deletetimetracked`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Users


### Invite User To Workspace

> 🔗 `https://developer.clickup.com/reference/inviteusertoworkspace`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get User

> 🔗 `https://developer.clickup.com/reference/getuser`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Edit User On Workspace

> 🔗 `https://developer.clickup.com/reference/edituseronworkspace`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Remove User From Workspace

> 🔗 `https://developer.clickup.com/reference/removeuserfromworkspace`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Views (API)


### Get Workspace (Everything level) Views

> 🔗 `https://developer.clickup.com/reference/getteamviews`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Workspace (Everything level) View

> 🔗 `https://developer.clickup.com/reference/createteamview`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Space Views

> 🔗 `https://developer.clickup.com/reference/getspaceviews`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Space View

> 🔗 `https://developer.clickup.com/reference/createspaceview`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Folder Views

> 🔗 `https://developer.clickup.com/reference/getfolderviews`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Folder View

> 🔗 `https://developer.clickup.com/reference/createfolderview`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get List Views

> 🔗 `https://developer.clickup.com/reference/getlistviews`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create List View

> 🔗 `https://developer.clickup.com/reference/createlistview`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get View

> 🔗 `https://developer.clickup.com/reference/getview`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Update View

> 🔗 `https://developer.clickup.com/reference/updateview`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete View

> 🔗 `https://developer.clickup.com/reference/deleteview`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get View Tasks

> 🔗 `https://developer.clickup.com/reference/getviewtasks`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Webhooks (API)


### Get Webhooks

> 🔗 `https://developer.clickup.com/reference/getwebhooks`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Webhook

> 🔗 `https://developer.clickup.com/reference/createwebhook`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Update Webhook

> 🔗 `https://developer.clickup.com/reference/updatewebhook`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete Webhook

> 🔗 `https://developer.clickup.com/reference/deletewebhook`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


## Extra (Descobertos)


### Update privacy and access of an object or location

> 🔗 `https://developer.clickup.com/reference/publicpatchacl`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Update privacy and access of an object or location

> 🔗 `https://developer.clickup.com/reference/publicpatchacl`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Workspace-level audit logs

> 🔗 `https://developer.clickup.com/reference/queryauditlog`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create Workspace-level audit logs

> 🔗 `https://developer.clickup.com/reference/queryauditlog`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Retrieve Channels

> 🔗 `https://developer.clickup.com/reference/getchatchannels`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Retrieve Channels

> 🔗 `https://developer.clickup.com/reference/getchatchannels`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create a Channel

> 🔗 `https://developer.clickup.com/reference/createchatchannel`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create a Channel on a Space, Folder, or List

> 🔗 `https://developer.clickup.com/reference/createlocationchatchannel`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create a Direct Message

> 🔗 `https://developer.clickup.com/reference/createdirectmessagechatchannel`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Retrieve a Channel

> 🔗 `https://developer.clickup.com/reference/getchatchannel`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Update a Channel

> 🔗 `https://developer.clickup.com/reference/updatechatchannel`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete a Channel

> 🔗 `https://developer.clickup.com/reference/deletechatchannel`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Retrieve Channel followers

> 🔗 `https://developer.clickup.com/reference/getchatchannelfollowers`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Retrieve Channel members

> 🔗 `https://developer.clickup.com/reference/getchatchannelmembers`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Retrieve Channel messages

> 🔗 `https://developer.clickup.com/reference/getchatmessages`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Send a message

> 🔗 `https://developer.clickup.com/reference/createchatmessage`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Update a message

> 🔗 `https://developer.clickup.com/reference/patchchatmessage`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete a message

> 🔗 `https://developer.clickup.com/reference/deletechatmessage`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Retrieve message reactions

> 🔗 `https://developer.clickup.com/reference/getchatmessagereactions`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create a message reaction

> 🔗 `https://developer.clickup.com/reference/createchatreaction`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Delete a message reaction

> 🔗 `https://developer.clickup.com/reference/deletechatreaction`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Retrieve message replies

> 🔗 `https://developer.clickup.com/reference/getchatmessagereplies`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create a reply message

> 🔗 `https://developer.clickup.com/reference/createreplymessage`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Retrieve message tagged users

> 🔗 `https://developer.clickup.com/reference/getchatmessagetaggedusers`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Post Subtype IDs

> 🔗 `https://developer.clickup.com/reference/getsubtypes`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Search for Docs

> 🔗 `https://developer.clickup.com/reference/searchdocspublic`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Search for Docs

> 🔗 `https://developer.clickup.com/reference/searchdocspublic`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create a Doc

> 🔗 `https://developer.clickup.com/reference/createdocpublic`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Fetch a Doc

> 🔗 `https://developer.clickup.com/reference/getdocpublic`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Fetch PageListing for a Doc

> 🔗 `https://developer.clickup.com/reference/getdocpagelistingpublic`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Fetch Pages belonging to a Doc

> 🔗 `https://developer.clickup.com/reference/getdocpagespublic`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create a Page

> 🔗 `https://developer.clickup.com/reference/createpagepublic`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get page

> 🔗 `https://developer.clickup.com/reference/getpagepublic`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Edit a Page

> 🔗 `https://developer.clickup.com/reference/editpagepublic`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Move a task to a new List

> 🔗 `https://developer.clickup.com/reference/movetask`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Move a task to a new List

> 🔗 `https://developer.clickup.com/reference/movetask`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Update task time estimates by user

> 🔗 `https://developer.clickup.com/reference/updatetimeestimatesbyuser`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Replace task time estimates

> 🔗 `https://developer.clickup.com/reference/replacetimeestimatesbyuser`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Attachments

> 🔗 `https://developer.clickup.com/reference/getparententityattachments`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Get Attachments

> 🔗 `https://developer.clickup.com/reference/getparententityattachments`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---


### Create an Attachment

> 🔗 `https://developer.clickup.com/reference/postentityattachment`

__Shell __Node __Ruby __PHP __Python

Click `Try It!` to start a request and see the response here!

---
