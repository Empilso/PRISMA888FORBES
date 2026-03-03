"use client";

import React, { useState, useEffect, memo } from 'react';

interface TypingTextProps {
    text: string;
    speed?: number;
    className?: string;
}

const TypingText = memo(({ text, speed = 15, className = "" }: TypingTextProps) => {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        if (!text) {
            setDisplayedText("");
            return;
        }

        let i = 0;
        setDisplayedText(""); // Reset on text change

        const interval = setInterval(() => {
            if (i < text.length) {
                setDisplayedText(text.substring(0, i + 1));
                i++;
            } else {
                clearInterval(interval);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed]);

    return <span className={className}>{displayedText}</span>;
});

TypingText.displayName = "TypingText";

export default TypingText;
