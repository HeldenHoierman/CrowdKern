-- CreateTable
CREATE TABLE "FontProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fontData" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FontProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlyphPair" (
    "id" TEXT NOT NULL,
    "fontProjectId" TEXT NOT NULL,
    "leftGlyph" TEXT NOT NULL,
    "rightGlyph" TEXT NOT NULL,
    "baselineKern" INTEGER NOT NULL DEFAULT 0,
    "currentMedian" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseCount" INTEGER NOT NULL DEFAULT 0,
    "skipCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GlyphPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KernAdjustment" (
    "id" TEXT NOT NULL,
    "glyphPairId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KernAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlyphPair_fontProjectId_leftGlyph_rightGlyph_key" ON "GlyphPair"("fontProjectId", "leftGlyph", "rightGlyph");

-- AddForeignKey
ALTER TABLE "GlyphPair" ADD CONSTRAINT "GlyphPair_fontProjectId_fkey" FOREIGN KEY ("fontProjectId") REFERENCES "FontProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KernAdjustment" ADD CONSTRAINT "KernAdjustment_glyphPairId_fkey" FOREIGN KEY ("glyphPairId") REFERENCES "GlyphPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;
