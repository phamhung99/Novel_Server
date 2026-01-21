import { useMemo } from 'react';

import {
    RichTextEditor,
    MenuControlsContainer,
    MenuDivider,
    MenuSelectHeading,
    MenuButtonBold,
    MenuButtonItalic,
    MenuButtonUnderline,
    MenuButtonStrikethrough,
} from 'mui-tiptap';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import {
    Table,
    TableRow,
    TableCell,
    TableHeader,
} from '@tiptap/extension-table';
import { TextStyle } from '@tiptap/extension-text-style';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Placeholder from '@tiptap/extension-placeholder';

import type { Editor } from '@tiptap/react';

interface ChapterRichEditorProps {
    content: string;
    onUpdate?: (html: string) => void;
    placeholder?: string;
    readOnly?: boolean;
    minHeight?: string | number;
}

export const ChapterRichEditor = ({
    content,
    onUpdate,
    placeholder = 'Chapter content...',
    readOnly = false,
    minHeight = '300px',
}: ChapterRichEditorProps) => {
    const extensions = useMemo(
        () => [
            StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
            Link.configure({ openOnClick: false }),
            Image.configure({ inline: true, allowBase64: true }),
            Table.configure({ resizable: true }),
            TableRow,
            TableCell,
            TableHeader,
            TextStyle,
            Bold.extend({
                parseHTML() {
                    return [
                        { tag: 'strong' },
                        { tag: 'b' },
                        {
                            tag: 'span',
                            getAttrs: (element) => {
                                const style = (element as HTMLElement).style;
                                return style.fontWeight === 'bold' ||
                                    style.fontWeight === '700'
                                    ? {}
                                    : false;
                            },
                        },
                    ];
                },
            }),
            Italic.extend({
                parseHTML() {
                    return [
                        { tag: 'em' },
                        { tag: 'i' },
                        {
                            tag: 'span',
                            getAttrs: (element) => {
                                const style = (element as HTMLElement).style;
                                return style.fontStyle === 'italic'
                                    ? {}
                                    : false;
                            },
                        },
                    ];
                },
            }),
            // Dynamic placeholder
            Placeholder.configure({
                placeholder,
            }),
        ],
        [placeholder],
    );

    return (
        <RichTextEditor
            content={content}
            onUpdate={({ editor }) => {
                if (onUpdate) {
                    onUpdate(editor.getHTML());
                }
            }}
            extensions={extensions}
            editable={!readOnly}
            renderControls={(editor: Editor | null) => (
                <MenuControlsContainer>
                    <MenuSelectHeading />
                    <MenuDivider />
                    <MenuButtonBold />
                    <MenuButtonItalic />
                    <MenuButtonUnderline />
                    <MenuButtonStrikethrough />
                </MenuControlsContainer>
            )}
            sx={{
                '& .ProseMirror': {
                    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                    fontSize: '1rem',
                    lineHeight: 1.6,
                    minHeight,
                    padding: '12px',
                    '& strong, & b': {
                        fontWeight: 800,
                    },
                    '& em, & i': {
                        fontStyle: 'italic',
                    },
                    '& h1': {
                        fontWeight: 900,
                        fontSize: '2.2rem',
                        margin: '1em 0 0.5em',
                    },
                    '& h2': {
                        fontWeight: 800,
                        fontSize: '1.8rem',
                        margin: '1em 0 0.4em',
                    },
                    '& h3': {
                        fontWeight: 700,
                        fontSize: '1.5rem',
                        margin: '1em 0 0.3em',
                    },
                    '& p': { marginBottom: '1em' },
                    '& ul, & ol': { paddingLeft: '2em', margin: '1em 0' },
                    '& img': { maxWidth: '100%', height: 'auto' },
                },
            }}
        />
    );
};
