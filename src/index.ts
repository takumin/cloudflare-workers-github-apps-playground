/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { App } from "@octokit/app";

export default {
	// eslint-disable-next-line no-unused-vars
	async fetch(request, env, ctx): Promise<Response> {
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

		const installationOctokit =
			await app.getInstallationOctokit(installationId);

		const { data } = await installationOctokit.request(
			"GET /installation/repositories",
		);

		return new Response(JSON.stringify(data), {
			headers: { "Content-Type": "application/json" },
		});
	},
} satisfies ExportedHandler<Env>;
