"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Link, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3, 
  Quote, 
  Eye, 
  EyeOff,
  Strikethrough
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { RichTextEditorProps } from "@/interfaces/ui-components";

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Type your content here...",
  className = "",
  minHeight = 120,
  initialPreview = false
}: RichTextEditorProps) {
  const [isPreview, setIsPreview] = useState(initialPreview);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(minHeight, textareaRef.current.scrollHeight)}px`;
    }
  }, [minHeight]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  // Insert text at cursor position
  const insertAtCursor = (before: string, after: string = "", placeholder: string = "") => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let newText;
    if (selectedText) {
      newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    } else {
      newText = value.substring(0, start) + before + (placeholder || "") + after + value.substring(end);
    }
    
    onChange(newText);
    
    // Set cursor position after insertion
    setTimeout(() => {
      if (selectedText) {
        textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
      } else {
        const newPosition = start + before.length + (placeholder ? placeholder.length : 0);
        textarea.setSelectionRange(newPosition, newPosition);
      }
      textarea.focus();
    }, 0);
  };

  // Format functions
  const formatBold = () => insertAtCursor("**", "**", "bold text");
  const formatItalic = () => insertAtCursor("*", "*", "italic text");
  const formatStrikethrough = () => insertAtCursor("~~", "~~", "strikethrough text");
  const formatCode = () => insertAtCursor("`", "`", "code");
  const formatHeading1 = () => insertAtCursor("# ", "", "Heading 1");
  const formatHeading2 = () => insertAtCursor("## ", "", "Heading 2");
  const formatHeading3 = () => insertAtCursor("### ", "", "Heading 3");
  const formatQuote = () => insertAtCursor("> ", "", "Quote");
  const formatUnorderedList = () => insertAtCursor("- ", "", "List item");
  const formatOrderedList = () => insertAtCursor("1. ", "", "List item");
  const formatLink = () => insertAtCursor("[", "](url)", "link text");

  // Toolbar button component
  const ToolbarButton = ({ 
    icon: Icon, 
    onClick, 
    tooltip, 
    isActive = false 
  }: { 
    icon: React.ComponentType<{ className?: string }>; 
    onClick: () => void; 
    tooltip: string; 
    isActive?: boolean; 
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
        isActive ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'
      }`}
      title={tooltip}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Text formatting */}
          <ToolbarButton icon={Bold} onClick={formatBold} tooltip="Bold (Ctrl+B)" />
          <ToolbarButton icon={Italic} onClick={formatItalic} tooltip="Italic (Ctrl+I)" />
          <ToolbarButton icon={Strikethrough} onClick={formatStrikethrough} tooltip="Strikethrough" />
          <ToolbarButton icon={Code} onClick={formatCode} tooltip="Inline Code" />
          
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          
          {/* Headings */}
          <ToolbarButton icon={Heading1} onClick={formatHeading1} tooltip="Heading 1" />
          <ToolbarButton icon={Heading2} onClick={formatHeading2} tooltip="Heading 2" />
          <ToolbarButton icon={Heading3} onClick={formatHeading3} tooltip="Heading 3" />
          
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          
          {/* Lists and others */}
          <ToolbarButton icon={List} onClick={formatUnorderedList} tooltip="Bullet List" />
          <ToolbarButton icon={ListOrdered} onClick={formatOrderedList} tooltip="Numbered List" />
          <ToolbarButton icon={Quote} onClick={formatQuote} tooltip="Quote" />
          <ToolbarButton icon={Link} onClick={formatLink} tooltip="Link" />
          
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          
          {/* Preview toggle */}
          <ToolbarButton 
            icon={isPreview ? EyeOff : Eye} 
            onClick={() => setIsPreview(!isPreview)} 
            tooltip={isPreview ? "Edit Mode" : "Preview Mode"}
            isActive={isPreview}
          />
        </div>
      </div>

      {/* Content area */}
      <div className="relative">
        {!isPreview ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              adjustTextareaHeight();
            }}
            placeholder={placeholder}
            className="w-full p-4 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none"
            style={{ minHeight: `${minHeight}px` }}
            onKeyDown={(e) => {
              // Handle keyboard shortcuts
              if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                  case 'b':
                    e.preventDefault();
                    formatBold();
                    break;
                  case 'i':
                    e.preventDefault();
                    formatItalic();
                    break;
                  case 'k':
                    e.preventDefault();
                    formatLink();
                    break;
                }
              }
            }}
          />
        ) : (
          <div 
            className="p-4 prose prose-sm max-w-none min-h-[120px] text-gray-800 dark:text-gray-100"
            style={{ minHeight: `${minHeight}px` }}
          >
            {value ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                  // Custom components for better styling
                  h1: ({ children }) => <h1 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100">{children}</h3>,
                  p: ({ children }) => <p className="mb-2 text-gray-700 dark:text-gray-300">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 text-gray-700 dark:text-gray-300">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 text-gray-700 dark:text-gray-300">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 mb-2">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children, ...props }) => {
                    const inline = !(props as { className?: string }).className?.includes('language-');
                    return inline ? (
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-100">
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm font-mono text-gray-800 dark:text-gray-100 overflow-x-auto">
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm font-mono text-gray-800 dark:text-gray-100 overflow-x-auto mb-2">
                      {children}
                    </pre>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                  strong: ({ children }) => <strong className="font-semibold text-gray-800 dark:text-gray-100">{children}</strong>,
                  em: ({ children }) => <em className="italic text-gray-700 dark:text-gray-300">{children}</em>,
                }}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-gray-400 dark:text-gray-500">{placeholder}</p>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2">
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
          <span>
            {isPreview ? "Preview mode" : "Edit mode"} • {value.length} characters
          </span>
          <span className="text-gray-400 dark:text-gray-500">
            Supports **bold**, *italic*, [links](url), lists, and more
          </span>
        </div>
      </div>
    </div>
  );
}
