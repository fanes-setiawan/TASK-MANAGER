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

  // Register width attributor to preserve column widths when resized by blot formatter
  const StyleAttributor = Quill.import('attributors/style') as any;
  if (StyleAttributor) {
    const WidthStyle = new StyleAttributor('width', 'width', {
      whitelist: null,
    });
    const HeightStyle = new StyleAttributor('height', 'height', {
      whitelist: null,
    });
    Quill.register(WidthStyle, true);
    Quill.register(HeightStyle, true);
  }

  // Quill strips out width/height from table cells unless explicitly defined in a custom format
  const TableCell: any = Quill.import('formats/td') || Quill.import('formats/table/cell') || Quill.import('blots/block');
  if (TableCell) {
    class CustomTableCell extends TableCell {
      static create(value: any) {
        const node = super.create(value);
        if (value && value.width) {
          node.style.width = value.width;
        }
        if (value && value.height) {
          node.style.height = value.height;
        }
        return node;
      }

      static formats(domNode: HTMLElement) {
        const formats = super.formats(domNode) || {};
        if (domNode.style.width) formats.width = domNode.style.width;
        if (domNode.style.height) formats.height = domNode.style.height;
        return formats;
      }

      format(name: string, value: any) {
        if (name === 'width' || name === 'height') {
          if (value) {
            this.domNode.style[name] = value;
          } else {
            this.domNode.style[name] = '';
          }
        } else {
          super.format(name, value);
        }
      }
    }
    // Register the custom table cell
    Quill.register(CustomTableCell, true);
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
          ['table', 'insertRowBelow', 'deleteRow', 'insertColRight', 'deleteCol'],
          ['clean'],
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
        }
      },
      table: true,
      blotFormatter: {},
      keyboard: {
        bindings: {
          tableEnter: {
            key: 13,
            handler: function (range: any, context: any) {
              if (context.format.table) {
                // @ts-ignore
                this.quill.insertText(range.index, '\n');
                // @ts-ignore
                this.quill.setSelection(range.index + 1);
                return false;
              }
              return true;
            }
          }
        }
      },
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
    if (!quillRef.current) return;
    const editor = quillRef.current.getEditor();
    const root = editor.root;

    const observer = new MutationObserver((mutations) => {
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
      
      if (shouldTrigger) {
        // Debounce or trigger directly
        if (onChange) {
          onChange(root.innerHTML);
        }
      }
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['style'],
      subtree: true,
    });

    return () => observer.disconnect();
  }, [onChange]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} onClick={handleClick}>
      <ReactQuill 
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        modules={modules}
        placeholder={placeholder}
        style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: 'none' }}
      />
    </div>
  );
}
