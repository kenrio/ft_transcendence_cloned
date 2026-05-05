import { z } from "zod";
import { RoomMemberParamsSchema, UserRoleEnum } from "./common";

/**
 * PATCH /api/rooms/:roomId/members/:userId パラメータ型
 */

/**
 * PATCH /api/rooms/:roomId/members/:userId ボディ型
 */
export const UpdateRoomMemberRoleParamSchema = RoomMemberParamsSchema;

export const UpdateRoomMemberRoleBodySchema = z.object({
	role: UserRoleEnum,
});

/**
 * TypeScriptの型をZodから抽出
 */

export type UpdateRoomMemberRoleParams = z.infer<
	typeof UpdateRoomMemberRoleParamSchema
>;
export type UpdateRoomMemberRoleBody = z.infer<
	typeof UpdateRoomMemberRoleBodySchema
>;

/**
 * Route型
 */
export interface UpdateRoomMemberRoleRoute {
	Params: UpdateRoomMemberRoleParams;
	Body: UpdateRoomMemberRoleBody;
}
