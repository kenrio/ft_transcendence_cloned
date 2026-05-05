/*
  Warnings:

  - A unique constraint covering the columns `[invitation_token]` on the table `Room` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Room_invitation_token_key" ON "Room"("invitation_token");
