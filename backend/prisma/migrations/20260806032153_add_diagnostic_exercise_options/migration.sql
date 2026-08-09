/*
  Warnings:

  - Added the required column `options` to the `DiagnosticExercise` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DiagnosticExercise" ADD COLUMN     "options" JSONB NOT NULL;
