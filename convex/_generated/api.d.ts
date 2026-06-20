/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiModel from "../aiModel.js";
import type * as conversationAgent from "../conversationAgent.js";
import type * as conversationAgentActions from "../conversationAgentActions.js";
import type * as crm from "../crm.js";
import type * as debug from "../debug.js";
import type * as graph from "../graph.js";
import type * as graphActions from "../graphActions.js";
import type * as manualConversionActions from "../manualConversionActions.js";
import type * as memory from "../memory.js";
import type * as news from "../news.js";
import type * as newsActions from "../newsActions.js";
import type * as repair from "../repair.js";
import type * as reset from "../reset.js";
import type * as seed from "../seed.js";
import type * as social from "../social.js";
import type * as socialActions from "../socialActions.js";
import type * as whatsapp from "../whatsapp.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiModel: typeof aiModel;
  conversationAgent: typeof conversationAgent;
  conversationAgentActions: typeof conversationAgentActions;
  crm: typeof crm;
  debug: typeof debug;
  graph: typeof graph;
  graphActions: typeof graphActions;
  manualConversionActions: typeof manualConversionActions;
  memory: typeof memory;
  news: typeof news;
  newsActions: typeof newsActions;
  repair: typeof repair;
  reset: typeof reset;
  seed: typeof seed;
  social: typeof social;
  socialActions: typeof socialActions;
  whatsapp: typeof whatsapp;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
