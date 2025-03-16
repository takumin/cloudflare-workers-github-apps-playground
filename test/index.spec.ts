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
		APP_ID: "test-app-id",
		PRIVATE_KEY: "test-private-key",
		INSTALLATION_ID: "12345",
	};

	const mockRepositoriesData = {
		repositories: [{ name: "test-repo" }],
	};

	beforeEach(() => {
		vi.resetAllMocks();
		const mockGetInstallationOctokit = vi.fn().mockResolvedValue({
			request: vi.fn().mockResolvedValue({ data: mockRepositoriesData }),
		});
		App.mockImplementation(() => ({
			getInstallationOctokit: mockGetInstallationOctokit,
		}));
	});

	it("returns installation repositories as JSON", async () => {
		const request = new Request("http://example.com");
		const ctx = createExecutionContext();

		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.headers.get("Content-Type")).toBe("application/json");
		expect(await response.json()).toEqual(mockRepositoriesData);
	});
});
