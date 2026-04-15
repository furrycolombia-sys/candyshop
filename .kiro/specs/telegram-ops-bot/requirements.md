# Requirements Document

## Introduction

The Telegram Ops Bot provides real-time operational visibility into the Candyshop monorepo deployment pipeline and server health. Instead of manually checking GitHub Actions or SSH-ing into the production server, the team receives Telegram notifications for new releases, deployment status, CI/CD pipeline outcomes, and server health issues. The bot runs as a lightweight Node.js service within the monorepo and integrates with GitHub Actions webhooks and a periodic health check scheduler.

## Glossary

- **Ops_Bot**: The Telegram bot service that sends operational notifications to a configured Telegram chat
- **Health_Checker**: The component that periodically probes application endpoints to determine service availability
- **Notification_Formatter**: The component that constructs structured Telegram messages from event payloads
- **GitHub_Webhook_Handler**: The HTTP endpoint that receives webhook events from GitHub Actions workflows
- **Telegram_Chat**: The Telegram group or channel where the Ops_Bot sends notifications
- **App_Endpoint**: An HTTP URL for one of the Candyshop applications (auth, store, admin, playground, landing, payments, studio) used for health probing
- **Health_Status**: The availability state of an App_Endpoint, either "healthy" or "unhealthy"
- **Release_Event**: A GitHub release creation event triggered when a release PR is merged to main
- **Deployment_Event**: A GitHub Actions workflow completion event for the deploy-production workflow
- **CI_Event**: A GitHub Actions workflow completion event for the CI workflow on pull requests
- **Alert_Cooldown**: A time window during which duplicate alerts for the same unhealthy service are suppressed
- **Recovery_Alert**: A notification sent when a previously unhealthy service returns to healthy status

## Requirements

### Requirement 1: Telegram Bot Configuration

**User Story:** As a developer, I want to configure the Telegram bot credentials and target chat via environment variables, so that the bot can be deployed across staging and production without code changes.

#### Acceptance Criteria

1. THE Ops_Bot SHALL read the Telegram bot token from the `TELEGRAM_BOT_TOKEN` environment variable
2. THE Ops_Bot SHALL read the target chat identifier from the `TELEGRAM_CHAT_ID` environment variable
3. IF the `TELEGRAM_BOT_TOKEN` environment variable is missing or empty, THEN THE Ops_Bot SHALL exit with a descriptive error message and a non-zero exit code
4. IF the `TELEGRAM_CHAT_ID` environment variable is missing or empty, THEN THE Ops_Bot SHALL exit with a descriptive error message and a non-zero exit code
5. WHEN the Ops_Bot starts, THE Ops_Bot SHALL validate the bot token by calling the Telegram `getMe` API and log the bot username on success

### Requirement 2: Release Notifications

**User Story:** As a developer, I want to receive a Telegram message when a new release is created on GitHub, so that I know a new version has been published without checking GitHub.

#### Acceptance Criteria

1. WHEN the GitHub_Webhook_Handler receives a Release_Event with action "created", THE Notification_Formatter SHALL construct a message containing the release tag name, the release title, and a link to the GitHub release page
2. WHEN the Notification_Formatter produces a release notification message, THE Ops_Bot SHALL send the message to the configured Telegram_Chat
3. THE Notification_Formatter SHALL include the release author username in the release notification message
4. IF the release body contains content, THEN THE Notification_Formatter SHALL include a truncated summary of the release notes limited to 500 characters

### Requirement 3: Deployment Status Notifications

**User Story:** As a developer, I want to receive Telegram notifications when a production deployment succeeds or fails, so that I have immediate visibility into deployment outcomes.

#### Acceptance Criteria

1. WHEN the GitHub_Webhook_Handler receives a Deployment_Event for the "Deploy Production" workflow with conclusion "success", THE Ops_Bot SHALL send a success notification to the Telegram_Chat containing the commit SHA, the branch name, and the actor who triggered the deployment
2. WHEN the GitHub_Webhook_Handler receives a Deployment_Event for the "Deploy Production" workflow with conclusion "failure", THE Ops_Bot SHALL send a failure notification to the Telegram_Chat containing the commit SHA, the branch name, the actor, and a link to the failed workflow run
3. WHEN the GitHub_Webhook_Handler receives a Deployment_Event for the "Deploy Production" workflow with conclusion "cancelled", THE Ops_Bot SHALL send a cancellation notification to the Telegram_Chat

### Requirement 4: CI Pipeline Notifications

**User Story:** As a developer, I want to receive Telegram notifications when CI checks fail on a pull request, so that I can address build issues promptly.

#### Acceptance Criteria

1. WHEN the GitHub_Webhook_Handler receives a CI_Event for the "CI" workflow with conclusion "failure", THE Ops_Bot SHALL send a failure notification to the Telegram_Chat containing the pull request number, the pull request title, the branch name, and a link to the failed workflow run
2. WHEN the GitHub_Webhook_Handler receives a CI_Event for the "CI" workflow with conclusion "success", THE Ops_Bot SHALL not send a notification to the Telegram_Chat
3. THE Notification_Formatter SHALL include the name of the failed job within the CI failure notification message when available

### Requirement 5: Server Health Monitoring

**User Story:** As a developer, I want the bot to periodically check if all Candyshop services are responding, so that I get alerted when a service goes down without having to manually check.

#### Acceptance Criteria

1. THE Health_Checker SHALL probe each App_Endpoint at a configurable interval read from the `HEALTH_CHECK_INTERVAL_SECONDS` environment variable, defaulting to 60 seconds
2. THE Health_Checker SHALL probe the following production App_Endpoints: auth (port 5000), store (port 5001), admin (port 5002), playground (port 5003), landing (port 5004), payments (port 5005), studio (port 5006)
3. THE Health_Checker SHALL consider an App_Endpoint healthy when the HTTP response status code is in the range 200-399 and the response is received within 10 seconds
4. WHEN an App_Endpoint transitions from healthy to unhealthy, THE Ops_Bot SHALL send an alert to the Telegram_Chat containing the service name, the port number, and the error details
5. WHEN an App_Endpoint transitions from unhealthy to healthy, THE Ops_Bot SHALL send a Recovery_Alert to the Telegram_Chat containing the service name and the duration of the outage
6. WHILE an App_Endpoint remains unhealthy, THE Ops_Bot SHALL suppress duplicate alerts for that service for the duration of the Alert_Cooldown period, configurable via the `ALERT_COOLDOWN_MINUTES` environment variable and defaulting to 5 minutes
7. THE Health_Checker SHALL read the base URL for health probes from the `HEALTH_CHECK_BASE_URL` environment variable, defaulting to `http://localhost`

### Requirement 6: GitHub Webhook Security

**User Story:** As a developer, I want the webhook endpoint to verify that incoming requests are genuinely from GitHub, so that the bot cannot be triggered by unauthorized sources.

#### Acceptance Criteria

1. THE GitHub_Webhook_Handler SHALL validate the `X-Hub-Signature-256` header on every incoming request using the webhook secret read from the `GITHUB_WEBHOOK_SECRET` environment variable
2. IF the `X-Hub-Signature-256` header is missing or the signature does not match, THEN THE GitHub_Webhook_Handler SHALL respond with HTTP status 401 and discard the request
3. IF the `GITHUB_WEBHOOK_SECRET` environment variable is missing or empty, THEN THE Ops_Bot SHALL exit with a descriptive error message and a non-zero exit code

### Requirement 7: Message Formatting

**User Story:** As a developer, I want notifications to be clearly formatted with emoji indicators and structured text, so that I can quickly scan messages and understand the status at a glance.

#### Acceptance Criteria

1. THE Notification_Formatter SHALL prefix release notifications with a 🚀 emoji
2. THE Notification_Formatter SHALL prefix successful deployment notifications with a ✅ emoji
3. THE Notification_Formatter SHALL prefix failed deployment and CI notifications with a ❌ emoji
4. THE Notification_Formatter SHALL prefix health alert notifications with a 🔴 emoji
5. THE Notification_Formatter SHALL prefix recovery notifications with a 🟢 emoji
6. THE Notification_Formatter SHALL format all messages using Telegram MarkdownV2 parse mode
7. THE Notification_Formatter SHALL escape special MarkdownV2 characters in dynamic content to prevent message delivery failures

### Requirement 8: Webhook HTTP Server

**User Story:** As a developer, I want the bot to expose an HTTP endpoint for receiving GitHub webhooks, so that GitHub Actions can notify the bot of events.

#### Acceptance Criteria

1. THE GitHub_Webhook_Handler SHALL listen on a port read from the `BOT_PORT` environment variable, defaulting to 3500
2. THE GitHub_Webhook_Handler SHALL expose a `POST /webhook` endpoint for receiving GitHub webhook payloads
3. THE GitHub_Webhook_Handler SHALL expose a `GET /health` endpoint that returns HTTP status 200 with a JSON body containing the bot uptime and the timestamp of the last health check run
4. IF the GitHub_Webhook_Handler receives a webhook event type that is not handled, THEN THE GitHub_Webhook_Handler SHALL respond with HTTP status 200 and take no further action

### Requirement 9: Startup and Graceful Shutdown

**User Story:** As a developer, I want the bot to start cleanly and shut down gracefully, so that it can be managed by PM2 on the production server alongside the other Candyshop apps.

#### Acceptance Criteria

1. WHEN the Ops_Bot starts successfully, THE Ops_Bot SHALL send a startup notification to the Telegram_Chat containing the bot version and the list of monitored App_Endpoints
2. WHEN the Ops_Bot receives a SIGTERM or SIGINT signal, THE Ops_Bot SHALL stop the Health_Checker, close the HTTP server, and send a shutdown notification to the Telegram_Chat before exiting
3. THE Ops_Bot SHALL complete the shutdown sequence within 10 seconds of receiving the termination signal

### Requirement 10: Notification Serialization and Retry

**User Story:** As a developer, I want the bot to handle Telegram API failures gracefully, so that transient network issues do not cause lost notifications.

#### Acceptance Criteria

1. IF the Telegram API returns an error or is unreachable, THEN THE Ops_Bot SHALL retry the message delivery up to 3 times with exponential backoff starting at 1 second
2. IF all retry attempts fail, THEN THE Ops_Bot SHALL log the failure with the message content and the error details to standard error
3. THE Ops_Bot SHALL serialize outgoing messages to ensure that concurrent events do not result in interleaved or out-of-order message delivery
