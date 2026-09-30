package com.storyvero.media

import org.junit.Assert.*
import org.junit.Test

class StoryMathTest {
    @Test fun fadesAtCutButKeepsOuterEdges() {
        assertEquals(1f, fadeValue(0, 3000, 300, false, true))
        assertEquals(0.5f, fadeValue(2850, 3000, 300, false, true))
        assertEquals(0f, fadeValue(3000, 3000, 300, false, true))
        assertEquals(0f, fadeValue(0, 3000, 300, true, false))
        assertEquals(1f, fadeValue(3000, 3000, 300, true, false))
        assertEquals(1f, fadeValue(0, 3000, 0, true, true))
    }
    @Test fun temporaryCleanupCannotMatchOriginalsOrCompletedExports() {
        assertTrue(isTemporaryExport("story-abc-123.mp4"))
        assertFalse(isTemporaryExport("holiday.mp4"))
        assertFalse(isTemporaryExport("Storyvero_abc.mp4"))
        assertFalse(isTemporaryExport("../story-abc.mp4"))
        assertFalse(isTemporaryExport("story-abc.jpg"))
    }
}
