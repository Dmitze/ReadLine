export declare function escapeMarkdownV2(text: string): string;
export declare function escapeMarkdown(text: string): string;
export declare function markdownToHtml(text: string): string;
export declare function safeFormat(text: string, useHtml?: boolean): {
    text: string;
    parseMode: 'HTML' | 'Markdown' | undefined;
};
export declare function truncateText(text: string, maxLength?: number): string;
export declare function formatUserName(firstName?: string, lastName?: string, username?: string): string;
//# sourceMappingURL=markdown.d.ts.map