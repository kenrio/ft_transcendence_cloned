import { z } from "zod";

export const UserRoleEnum = z.enum(["PLAYER", "SPECTATOR"]);
export const GameModeEnum = z.enum(["DEFAULT", "ONE_STROKE"]);

export const RoomMemberParamsSchema = z.object({
	roomId: z.coerce.number(),
	userId: z.coerce.number(),
});

export const RoomMemberBodySchema = z.object({
	isReady: z.coerce.boolean(),
	token: z.coerce.string(),
});

export const RoomIdParamsSchema = z.object({
	roomId: z.coerce.number(),
});

export const UserIdParamsSchema = z.object({
	userId: z.coerce.number(),
});

export type RoomMemberParams = z.infer<typeof RoomMemberParamsSchema>;
export type RoomMemberBody = z.infer<typeof RoomMemberBodySchema>;

export interface RoomMemberRoute {
	Params: RoomMemberParams;
	Body: RoomMemberBody;
}
