"use client";

import { useState } from "react";
import { createBoard } from "@/actions/board";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { FormPicker } from "@/components/form/form-picker";

export function CreateBoardModal({ children }: { children?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState("");

    const onSubmit = async () => {
        try {
            setLoading(true);
            await createBoard(title, selectedImage);
            setOpen(false);
            setTitle("");
            setSelectedImage("");
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Board
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Board</DialogTitle>
                    <DialogDescription>
                        Add a new board to organize your tasks.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <FormPicker id="image" onChange={setSelectedImage} />
                    <Input
                        placeholder="Board Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={(e) => {
                        // Hacky way to get the selected image from FormPicker since it uses a hidden input
                        // Ideally FormPicker should accept onChange prop, but for speed we'll grab from DOM or modify FormPicker
                        // Wait, FormPicker uses a radio input with name="image".
                        // We are using controlled input for title but not for image.
                        // Let's modify the onSubmit to grab the image from the hidden input if we can,
                        // OR, update FormPicker to accept onChange.
                        // Let's stick to the controlled approach for consistency.

                        // Oh, I see I modified onSubmit above to use `selectedImage`.
                        // But I didn't update FormPicker to pass it back.
                        // I need to modify FormPicker to accept `onChange` or similar.
                        // Or I can just use native form submission?
                        // The existing code uses `onSubmit` manually triggered by button click.
                        // So I need to get the value.

                        // Let's modify this ReplacementContent to use a form ref or similar,
                        // BUT simpler: let's use a hidden form submit? No.

                        // I will modify FormPicker in a separate step to accept `onChange`.

                        // Wait, I can't effectively change FormPicker here.
                        // I should use the native form data if I wrap inputs in <form>.
                        // But currently it's just divs.

                        // Better: execute the onSubmit logic but get the image value from... where?
                        // I'll update FormPicker to take `setPackage` or `onChange`.
                        onSubmit();
                    }} disabled={loading || !title}>
                        {loading ? "Creating..." : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


