// GitHub Apps API playground worker — returns the installation's repository list as JSON.

import { App } from "@octokit/app";

export default {
	async fetch(_request, env, _ctx): Promise<Response> {
		const missing: string[] = [];
		if (!env.APP_ID) missing.push("APP_ID");
		if (!env.PRIVATE_KEY) missing.push("PRIVATE_KEY");
		if (!env.INSTALLATION_ID) missing.push("INSTALLATION_ID");

		if (missing.length > 0) {
			return new Response(
				JSON.stringify({ error: "Missing required configuration", missing }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const app = new App({
			appId: env.APP_ID,
			privateKey: env.PRIVATE_KEY,
		});

		const installationId = Number(env.INSTALLATION_ID);
		if (Number.isNaN(installationId)) {
			return new Response(
				JSON.stringify({ error: "Invalid INSTALLATION_ID" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		try {
			const installationOctokit =
				await app.getInstallationOctokit(installationId);

			const { data } = await installationOctokit.request(
				"GET /installation/repositories",
			);

			return new Response(JSON.stringify(data), {
				headers: { "Content-Type": "application/json" },
			});
		} catch (error) {
			console.error(error);
			const message = error instanceof Error ? error.message : "Unknown error";
			return new Response(JSON.stringify({ error: message }), {
				status: 502,
				headers: { "Content-Type": "application/json" },
			});
		}
	},
} satisfies ExportedHandler<Env>;
