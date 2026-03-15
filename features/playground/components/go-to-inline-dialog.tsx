"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface GoToLineDialogProps {
  isOpen: boolean
  onClose: () => void
  onGoToLine: (line: number, column?: number) => void
  maxLines?: number
}

export function GoToLineDialog({ isOpen, onClose, onGoToLine, maxLines }: GoToLineDialogProps) {
  const [lineNumber, setLineNumber] = useState("")
  const [columnNumber, setColumnNumber] = useState("")

  const handleSubmit = () => {
    const line = Number.parseInt(lineNumber)
    const column = columnNumber ? Number.parseInt(columnNumber) : undefined

    if (!isNaN(line) && line > 0) {
      onGoToLine(line, column)
      onClose()
      setLineNumber("")
      setColumnNumber("")
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleSubmit()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Go to Line</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="line-number">Line number</Label>
            <Input
              id="line-number"
              type="number"
              value={lineNumber}
              onChange={(e) => setLineNumber(e.target.value)}
              placeholder="Enter line number..."
              min="1"
              max={maxLines}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {maxLines && <p className="text-xs text-muted-foreground">(1 - {maxLines})</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="column-number">Column number (optional)</Label>
            <Input
              id="column-number"
              type="number"
              value={columnNumber}
              onChange={(e) => setColumnNumber(e.target.value)}
              placeholder="Enter column number..."
              min="1"
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!lineNumber || isNaN(Number.parseInt(lineNumber))}>
            Go to Line
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}