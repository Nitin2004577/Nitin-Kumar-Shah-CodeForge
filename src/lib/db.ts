
// import dotenv from "dotenv";
// dotenv.config();

// import { PrismaClient } from "@prisma/client";

// declare global {
// 	// allow caching the prisma client on the global object in development
// 	// eslint-disable-next-line no-var
// 	var prisma: PrismaClient | undefined;
// }

// const isNodeRuntime = typeof process !== "undefined" && typeof process.once === "function";

// if (!isNodeRuntime) {
// 	throw new Error(
// 		"Prisma Client cannot be initialized in this runtime (process.once is not available).\n" +
// 			"Make sure you only import `db` from server-side Node code (API routes or server components), not from client components or Edge/worker runtimes."
// 	);
// }

// const prismaClient = globalThis.prisma || new PrismaClient();

// if (process.env.NODE_ENV !== "production") globalThis.prisma = prismaClient;

// export const db = prismaClient;

// // import dotenv from "dotenv";
// // // Ensure dotenv is run at the very top to load environment variables
// // dotenv.config(); 

// // import { PrismaClient } from "@prisma/client";

// // // This is the standard singleton pattern for Next.js/development environment
// // const globalForPrisma = global as unknown as { prisma?: PrismaClient };
// // export const db = 
// //     globalForPrisma.prisma || 
// //     new PrismaClient({
// //         // This 'log' property is a valid option in the PrismaClient constructor
// //         log: process.env.NODE_ENV === "development" 
// //             ? ["query", "error", "warn"] 
// //             : ["error"],
// //         // You MUST NOT pass the 'datasources' object to set the URL here.
// //         // Prisma will automatically read process.env.DATABASE_URL.
// //         // If the URL is missing, you'll get an error, but NOT this TypeScript error.
// //     });

// // if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;




// // import "dotenv/config";
// // import { PrismaClient } from '../../generated/prisma/client'

// // const prisma = new PrismaClient()

// // export { prisma }

import "dotenv/config";
import { PrismaClient } from '../../generated/prisma/client'

const prisma = new PrismaClient()

// Provide both `prisma` and `db` named exports for compatibility
export { prisma }
export const db = prisma