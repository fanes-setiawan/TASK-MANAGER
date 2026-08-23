import React, { useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import 'quill-mention/dist/quill.mention.css';

if (typeof window !== 'undefined') {
  const { Mention, MentionBlot } = require('quill-mention');
  const BlotFormatter = require('quill-blot-formatter').default;
  
  Quill.register({
    'blots/mention': MentionBlot,
    'modules/mention': Mention,
    'modules/blotFormatter': BlotFormatter
  });
  
  // Add SVG icons for table operations
  const icons = Quill.import("ui/icons") as Record<string, string>;
  icons["table"] = '<svg viewBox="0 0 18 18"><rect class="ql-stroke" height="12" width="12" x="3" y="3"></rect><rect class="ql-fill" height="2" width="12" x="3" y="8"></rect><rect class="ql-fill" height="12" width="2" x="8" y="3"></rect></svg>';
  icons["insertRowBelow"] = '<svg viewBox="0 0 18 18"><path class="ql-stroke" d="M3,3 L15,3 L15,15 L3,15 L3,3 Z"></path><path class="ql-fill" d="M3,8 L15,8 L15,10 L3,10 L3,8 Z"></path><line class="ql-stroke" x1="9" x2="9" y1="12" y2="15"></line><line class="ql-stroke" x1="6" x2="9" y1="12" y2="15"></line><line class="ql-stroke" x1="12" x2="9" y1="12" y2="15"></line></svg>'; // approximate
  icons["deleteRow"] = '<svg viewBox="0 0 18 18"><path class="ql-stroke" d="M3,3 L15,3 L15,15 L3,15 L3,3 Z"></path><line class="ql-stroke" x1="3" x2="15" y1="9" y2="9"></line><line class="ql-stroke" x1="6" x2="12" y1="6" y2="12"></line><line class="ql-stroke" x1="12" x2="6" y1="6" y2="12"></line></svg>';
  icons["insertColRight"] = '<svg viewBox="0 0 18 18"><path class="ql-stroke" d="M3,3 L15,3 L15,15 L3,15 L3,3 Z"></path><path class="ql-fill" d="M8,3 L10,3 L10,15 L8,15 L8,3 Z"></path><line class="ql-stroke" x1="12" x2="15" y1="9" y2="9"></line><line class="ql-stroke" x1="12" x2="15" y1="6" y2="9"></line><line class="ql-stroke" x1="12" x2="15" y1="12" y2="9"></line></svg>';
  icons["deleteCol"] = '<svg viewBox="0 0 18 18"><path class="ql-stroke" d="M3,3 L15,3 L15,15 L3,15 L3,3 Z"></path><line class="ql-stroke" x1="9" x2="9" y1="3" y2="15"></line><line class="ql-stroke" x1="6" x2="12" y1="6" y2="12"></line><line class="ql-stroke" x1="12" x2="6" y1="6" y2="12"></line></svg>';
  icons["insertLineBreak"] = '<svg viewBox="0 0 18 18"><path class="ql-stroke" d="M12,4 L12,12 L5,12"></path><polyline class="ql-stroke" points="8 9 5 12 8 15"></polyline></svg>';
  icons["fullscreen"] = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';

  try {
    const Parchment = Quill.import('parchment') as any;
    const StyleAttributor = Parchment.Attributor?.Style || (Parchment as any).StyleAttributor;
    
    if (StyleAttributor) {
      const WidthStyle = new StyleAttributor('width', 'width', {
        scope: Parchment.Scope?.ANY || 0,
      });
      const HeightStyle = new StyleAttributor('height', 'height', {
        scope: Parchment.Scope?.ANY || 0,
      });
      Quill.register(WidthStyle, true);
      Quill.register(HeightStyle, true);
    }

    // Register SoftBreak for newlines in tables
    const Embed = Quill.import('blots/embed') as any;
    class SoftBreak extends Embed {
      static blotName = 'softBreak';
      static tagName = 'br';
    }
    Quill.register(SoftBreak);

  } catch (e) {
    console.warn('Could not register attributors or blots', e);
  }
}

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  onMentionClick?: (id: string, text: string) => void;
  apiTesterCollections?: any[];
}

export default function QuillEditor({ value, onChange, readOnly, placeholder, onMentionClick, apiTesterCollections }: QuillEditorProps) {
  const modules = useMemo(() => {
    return {
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'color': [] }, { 'background': [] }],
          [{ list: 'ordered' }, { list: 'bullet' }, { 'align': [] }],
          ['link', 'image'],
          ['table', 'insertRowBelow', 'deleteRow', 'insertColRight', 'deleteCol', 'insertLineBreak'],
          ['clean', 'fullscreen'],
        ],
        handlers: {
          table: function () {
            // @ts-ignore
            this.quill.getModule('table').insertTable(2, 2);
          },
          insertRowBelow: function () {
            // @ts-ignore
            this.quill.getModule('table').insertRowBelow();
          },
          deleteRow: function () {
            // @ts-ignore
            this.quill.getModule('table').deleteRow();
          },
          insertColRight: function () {
            // @ts-ignore
            this.quill.getModule('table').insertColumnRight();
          },
          deleteCol: function () {
            // @ts-ignore
            this.quill.getModule('table').deleteColumn();
          },
          insertLineBreak: function () {
            // @ts-ignore
            const range = this.quill.getSelection();
            if (range) {
              // @ts-ignore
              this.quill.insertEmbed(range.index, 'softBreak', true, 'user');
              // @ts-ignore
              this.quill.insertText(range.index + 1, '\u200B', 'user');
              // @ts-ignore
              this.quill.setSelection(range.index + 2);
            }
          },
          fullscreen: function () {
            // @ts-ignore
            const quillContainer = this.quill.container;
            const wrapper = quillContainer.closest('.quill-editor-wrapper');
            if (wrapper) {
              wrapper.classList.toggle('is-fullscreen');
            }
          }
        }
      },
      table: true,
      blotFormatter: {},
      mention: {
        allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
        mentionDenotationChars: ["@"],
        source: function (searchTerm: string, renderList: (arr: any[], searchTerm: string) => void, mentionChar: string) {
          let values: any[] = [];
          if (apiTesterCollections && apiTesterCollections.length > 0) {
            apiTesterCollections.forEach(folder => {
              if (folder.requests) {
                folder.requests.forEach((req: any) => {
                  values.push({
                    id: String(req.id),
                    value: req.name + ' (' + req.method + ')'
                  });
                });
              }
            });
          }

          if (searchTerm.length === 0) {
            renderList(values, searchTerm);
          } else {
            const matches = values.filter((item) =>
              item.value.toLowerCase().includes(searchTerm.toLowerCase())
            );
            renderList(matches, searchTerm);
          }
        },
        renderItem: function(item: any, searchTerm: string) {
          const div = document.createElement('div');
          div.style.display = 'flex';
          div.style.alignItems = 'center';
          div.style.gap = '8px';
          div.innerHTML = `
            <span class="material-symbols-outlined" style="font-size: 16px; color: #0ea5e9;">api</span>
            <span style="font-size: 13px;">${item.value}</span>
          `;
          return div;
        },
        onSelect: function(item: any, insertItem: (item: any) => void) {
          insertItem(item);
        }
      },
    };
  }, [apiTesterCollections]);

  // Handle clicking on mentions
  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const mentionNode = target.closest('.mention');
    if (mentionNode) {
      const id = mentionNode.getAttribute('data-id');
      const text = mentionNode.getAttribute('data-value');
      if (id && text && onMentionClick) {
        onMentionClick(id, text);
      }
    }
  };

  const quillRef = React.useRef<ReactQuill>(null);

  React.useEffect(() => {
    if (!quillRef.current || readOnly) return;
    const editor = quillRef.current.getEditor();
    const root = editor.root;

    let isResizing = false;
    let currentTd: HTMLElement | null = null;
    let startX = 0;
    let startWidth = 0;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TD' || target.tagName === 'TH') {
        const rect = target.getBoundingClientRect();
        if (e.clientX > rect.right - 10) {
          isResizing = true;
          currentTd = target;
          startX = e.clientX;
          startWidth = rect.width;
          e.preventDefault();
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && currentTd) {
        const diff = e.clientX - startX;
        currentTd.style.width = `${startWidth + diff}px`;
      } else {
        const target = e.target as HTMLElement;
        if (target.tagName === 'TD' || target.tagName === 'TH') {
          const rect = target.getBoundingClientRect();
          if (e.clientX > rect.right - 10) {
            target.style.cursor = 'col-resize';
          } else {
            target.style.cursor = 'text';
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizing && currentTd) {
        isResizing = false;
        // Trigger onChange so Quill converts it and saves it
        if (onChange) {
          onChange(root.innerHTML);
        }
        currentTd = null;
      }
    };

    root.addEventListener('mousedown', handleMouseDown);
    root.addEventListener('mousemove', handleMouseMove);
    root.addEventListener('mouseup', handleMouseUp);
    root.addEventListener('mouseleave', handleMouseUp);

    const observer = new MutationObserver((mutations) => {
      if (isResizing) return; // don't trigger onChange while actively dragging
      let shouldTrigger = false;
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target as HTMLElement;
          if (target.tagName === 'TD' || target.tagName === 'TH' || target.tagName === 'TABLE') {
            shouldTrigger = true;
            break;
          }
        }
      }
      if (shouldTrigger && onChange) {
        onChange(root.innerHTML);
      }
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['style'],
      subtree: true,
    });

    return () => {
      root.removeEventListener('mousedown', handleMouseDown);
      root.removeEventListener('mousemove', handleMouseMove);
      root.removeEventListener('mouseup', handleMouseUp);
      root.removeEventListener('mouseleave', handleMouseUp);
      observer.disconnect();
    };
  }, [onChange, readOnly]);

  return (
    <div className="quill-editor-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column' }} onClick={handleClick}>
      <ReactQuill 
        ref={quillRef}
        theme="snow"
        defaultValue={value}
        onChange={onChange}
        readOnly={readOnly}
        modules={modules}
        placeholder={placeholder}
        style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: 'none' }}
      />
    </div>
  );
}
