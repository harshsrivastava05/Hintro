"use client";

import { useEffect, useState } from "react";
import { unsplash } from "@/lib/unsplash";
import { Check, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";

// Define the Unsplash Image type based on what we need
interface UnsplashImage {
    id: string;
    urls: {
        thumb: string;
        full: string;
        regular: string;
        small: string;
    };
    links: {
        html: string;
    };
    user: {
        name: string;
    };
}

interface FormPickerProps {
    id: string;
    errors?: Record<string, string[] | undefined>;
    onChange?: (value: string) => void;
}

export const FormPicker = ({ id, errors, onChange }: FormPickerProps) => {
    const { pending } = useFormStatus();

    const [images, setImages] = useState<UnsplashImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

    useEffect(() => {
        const fetchImages = async () => {
            try {
                // Fetch default collection or random images
                const result = await unsplash.photos.getRandom({
                    collectionIds: ["317099"], // "Unsplash Editorial" or a specific collection ID for productivity/nature
                    count: 9,
                });

                if (result && result.response) {
                    const newImages = (result.response as unknown as UnsplashImage[]);
                    setImages(newImages);
                } else {
                    console.error("Failed to get images from Unsplash");
                }
            } catch (error) {
                console.log(error);
                setImages([]); // TODO: Set fallback images
            } finally {
                setIsLoading(false);
            }
        };

        fetchImages();
    }, []);

    if (isLoading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-sky-700 animate-spin" />
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="grid grid-cols-3 gap-2 mb-2">
                {images.map((image) => (
                    <div
                        key={image.id}
                        className={`
                            cursor-pointer relative aspect-video group hover:opacity-75 transition bg-muted 
                            ${pending && "opacity-50 hover:opacity-50 cursor-auto"}
                        `}
                        onClick={() => {
                            if (pending) return;
                            setSelectedImageId(image.id);
                            onChange?.(`${image.id}|${image.urls.thumb}|${image.urls.full}|${image.links.html}|${image.user.name}`);
                        }}
                    >
                        <input
                            type="radio"
                            id={id}
                            name={id}
                            className="hidden"
                            checked={selectedImageId === image.id}
                            onChange={() => { }} // Controlled by div click
                            value={`${image.id}|${image.urls.thumb}|${image.urls.full}|${image.links.html}|${image.user.name}`}
                        />
                        <Image
                            src={image.urls.thumb}
                            alt="Unsplash image"
                            className="object-cover rounded-sm"
                            fill
                        />
                        {selectedImageId === image.id && (
                            <div className="absolute inset-y-0 h-full w-full bg-black/30 flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                            </div>
                        )}
                        <Link
                            href={image.links.html}
                            target="_blank"
                            className="opacity-0 group-hover:opacity-100 absolute bottom-0 w-full text-[10px] truncate text-white hover:underline p-1 bg-black/50"
                        >
                            {image.user.name}
                        </Link>
                    </div>
                ))}
            </div>
            {errors?.[id] && (
                <div className="text-xs text-rose-500">
                    {errors[id]?.map((error: string) => (
                        <div key={error}>{error}</div>
                    ))}
                </div>
            )}
        </div>
    );
};
