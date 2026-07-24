import {
	createExecutionContext,
	waitOnExecutionContext,
} from "cloudflare:test";
import { App } from "@octokit/app";
import { beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";

vi.mock("@octokit/app", () => ({
	App: vi.fn(),
}));

describe("GitHub Apps API worker", () => {
	const mockEnv = {
		MODE: "development",
		APP_ID: "test-app-id",
		CLIENT_ID: "test-client-id",
		CLIENT_SECRET: "test-client-secret",
		PRIVATE_KEY: "test-private-key",
		INSTALLATION_ID: "12345",
	} satisfies Env;

	const mockRepositoriesData = {
		repositories: [{ name: "test-repo" }],
	};

	beforeEach(() => {
		vi.resetAllMocks();
		const mockGetInstallationOctokit = vi.fn().mockResolvedValue({
			request: vi.fn().mockResolvedValue({ data: mockRepositoriesData }),
		});
		vi.mocked(App).mockImplementation(
			class {
				getInstallationOctokit = mockGetInstallationOctokit;
			} as unknown as typeof App,
		);
	});

	it("returns installation repositories as JSON", async () => {
		const request = new Request("http://example.com") as Request<
			unknown,
			IncomingRequestCfProperties
		>;
		const ctx = createExecutionContext();

		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.headers.get("Content-Type")).toBe("application/json");
		expect(await response.json()).toEqual(mockRepositoriesData);
	});

	it("returns a 400 config error when APP_ID and PRIVATE_KEY are missing", async () => {
		const request = new Request("http://example.com") as Request<
			unknown,
			IncomingRequestCfProperties
		>;
		const ctx = createExecutionContext();

		const response = await worker.fetch(
			request,
			{ ...mockEnv, APP_ID: "", PRIVATE_KEY: "" },
			ctx,
		);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(400);
		expect(response.headers.get("Content-Type")).toBe("application/json");
		expect(await response.json()).toEqual({
			error: "Missing required configuration",
			missing: ["APP_ID", "PRIVATE_KEY"],
		});
	});

	it("returns a 400 config error when INSTALLATION_ID is missing", async () => {
		const request = new Request("http://example.com") as Request<
			unknown,
			IncomingRequestCfProperties
		>;
		const ctx = createExecutionContext();

		const response = await worker.fetch(
			request,
			{ ...mockEnv, INSTALLATION_ID: "" },
			ctx,
		);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(400);
		expect(response.headers.get("Content-Type")).toBe("application/json");
		expect(await response.json()).toEqual({
			error: "Missing required configuration",
			missing: ["INSTALLATION_ID"],
		});
	});

	it("returns a 400 error when INSTALLATION_ID is not a number", async () => {
		const request = new Request("http://example.com") as Request<
			unknown,
			IncomingRequestCfProperties
		>;
		const ctx = createExecutionContext();

		const response = await worker.fetch(
			request,
			{ ...mockEnv, INSTALLATION_ID: "not-a-number" },
			ctx,
		);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(400);
		expect(response.headers.get("Content-Type")).toBe("application/json");
		expect(await response.json()).toEqual({ error: "Invalid INSTALLATION_ID" });
	});

	it("returns a 502 JSON error response when the GitHub API call fails", async () => {
		const mockGetInstallationOctokit = vi.fn().mockResolvedValue({
			request: vi.fn().mockRejectedValue(new Error("GitHub API failure")),
		});
		vi.mocked(App).mockImplementation(
			class {
				getInstallationOctokit = mockGetInstallationOctokit;
			} as unknown as typeof App,
		);

		const request = new Request("http://example.com") as Request<
			unknown,
			IncomingRequestCfProperties
		>;
		const ctx = createExecutionContext();

		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(502);
		expect(response.headers.get("Content-Type")).toBe("application/json");
		expect(await response.json()).toEqual({ error: "GitHub API failure" });
	});

	it("returns 404 for a non-root path", async () => {
		const request = new Request("http://example.com/other") as Request<
			unknown,
			IncomingRequestCfProperties
		>;
		const ctx = createExecutionContext();

		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not Found" });
	});

	it("returns 404 for a non-GET method", async () => {
		const request = new Request("http://example.com", {
			method: "POST",
		}) as Request<unknown, IncomingRequestCfProperties>;
		const ctx = createExecutionContext();

		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not Found" });
	});

	it("returns 401 when API_TOKEN is set and no Authorization header is sent", async () => {
		const request = new Request("http://example.com") as Request<
			unknown,
			IncomingRequestCfProperties
		>;
		const ctx = createExecutionContext();

		const response = await worker.fetch(
			request,
			{ ...mockEnv, API_TOKEN: "secret-token" },
			ctx,
		);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 401 when API_TOKEN is set and the wrong token is sent", async () => {
		const request = new Request("http://example.com", {
			headers: { Authorization: "Bearer wrong-token" },
		}) as Request<unknown, IncomingRequestCfProperties>;
		const ctx = createExecutionContext();

		const response = await worker.fetch(
			request,
			{ ...mockEnv, API_TOKEN: "secret-token" },
			ctx,
		);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns installation repositories when the correct token is sent", async () => {
		const request = new Request("http://example.com", {
			headers: { Authorization: "Bearer secret-token" },
		}) as Request<unknown, IncomingRequestCfProperties>;
		const ctx = createExecutionContext();

		const response = await worker.fetch(
			request,
			{ ...mockEnv, API_TOKEN: "secret-token" },
			ctx,
		);
		await waitOnExecutionContext(ctx);

		expect(response.headers.get("Content-Type")).toBe("application/json");
		expect(await response.json()).toEqual(mockRepositoriesData);
	});

	// The Hono migration (#438) enforces Bearer auth via a catch-all
	// `app.use("*")` that runs before route matching, and delegates the header
	// check to Hono's bearerAuth middleware. Codex flagged two behavior changes
	// from the pre-Hono exact-match contract (#438 review): auth now runs before
	// the 404 route guard, and a non-Bearer Authorization header yields 400
	// instead of 401. Both were accepted as the intended behavior; the tests
	// below pin it so any future change is deliberate.
	it("returns 401 for a non-root path when API_TOKEN is set and no Authorization header is sent", async () => {
		const request = new Request("http://example.com/other") as Request<
			unknown,
			IncomingRequestCfProperties
		>;
		const ctx = createExecutionContext();

		const response = await worker.fetch(
			request,
			{ ...mockEnv, API_TOKEN: "secret-token" },
			ctx,
		);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 401 for a non-GET method when API_TOKEN is set and no Authorization header is sent", async () => {
		const request = new Request("http://example.com", {
			method: "POST",
		}) as Request<unknown, IncomingRequestCfProperties>;
		const ctx = createExecutionContext();

		const response = await worker.fetch(
			request,
			{ ...mockEnv, API_TOKEN: "secret-token" },
			ctx,
		);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 400 when API_TOKEN is set and the Authorization header is not a Bearer token", async () => {
		const request = new Request("http://example.com", {
			headers: { Authorization: "Token secret-token" },
		}) as Request<unknown, IncomingRequestCfProperties>;
		const ctx = createExecutionContext();

		const response = await worker.fetch(
			request,
			{ ...mockEnv, API_TOKEN: "secret-token" },
			ctx,
		);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 400 when API_TOKEN is set and the Authorization header is Bearer with no token", async () => {
		const request = new Request("http://example.com", {
			headers: { Authorization: "Bearer" },
		}) as Request<unknown, IncomingRequestCfProperties>;
		const ctx = createExecutionContext();

		const response = await worker.fetch(
			request,
			{ ...mockEnv, API_TOKEN: "secret-token" },
			ctx,
		);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});
});
