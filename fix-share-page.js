const fs = require('fs');
let content = fs.readFileSync('src/app/share/payment/page.tsx', 'utf8');

// 1. Imports
content = content.replace(
  'import { auth } from "@/lib/firebase/client";\nimport { onAuthStateChanged } from "firebase/auth";\nimport { useRouter } from "next/navigation";',
  'import { useSearchParams } from "next/navigation";'
);

// 2. Component signature and state
content = content.replace(
  'export default function PaymentPage() {',
  `export default function SharedPaymentPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("u");
  const targetCompany = searchParams.get("c") || "All";`
);
content = content.replace('const router = useRouter();\n', '');
content = content.replace('const [showShareModal, setShowShareModal] = useState(false);\n  const [shareCompany, setShareCompany] = useState("All");\n  const [authUid, setAuthUid] = useState<string | null>(null);', '');
content = content.replace('const [selectedCompany, setSelectedCompany] = useState("All");', 'const [selectedCompany, setSelectedCompany] = useState(targetCompany);');

// 3. Auth Effect
content = content.replace(
  /useEffect\(\(\) => \{\n    const unsubscribe = onAuthStateChanged\(auth[\s\S]*?return \(\) => unsubscribe\(\);\n  \}, \[\]\);/m,
  `useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const fetchProjects = async () => {
      try {
        const data = await getProjects(userId);
        let visible = data.filter(p => !(p as any).paymentHidden);
        if (targetCompany !== "All") {
          visible = visible.filter(p => (p.clientName || p.company) === targetCompany);
        }
        setProjects(visible);
      } catch (error) {
        console.error("Failed to fetch projects", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [userId, targetCompany]);`
);

// 4. Handlers (read-only)
content = content.replace(/const handleStatusChange = async [\s\S]*?console\.error\("Failed to update status", error\);\n    \}\n  \};/m, 'const handleStatusChange = () => {};');
content = content.replace(/const handleDelete = \([\s\S]*?setOpenDropdownId\(null\);\n  \};/m, 'const handleDelete = () => {};');
content = content.replace(/const handleToggleHide = async [\s\S]*?console\.error\("Failed to toggle hide status", error\);\n    \}\n  \};/m, 'const handleToggleHide = () => {};');

// 5. Header title
content = content.replace('<h2>Payments</h2>', '<h2>{targetCompany !== "All" ? `${targetCompany} Payments` : "All Payments"}</h2>\n          <p>Shared Payment Dashboard</p>');
content = content.replace('<p>Track your project payments, invoices, and billing statuses.</p>', '');

// 6. Header Buttons
content = content.replace(/<button className=\{styles\.btnShare\} onClick=\{.*?\}\>[\s\S]*?<\/button>/g, '');
content = content.replace(/<button className=\{styles\.btnNewPayment\} onClick=\{.*?\}\>[\s\S]*?<\/button>/g, '');

// 7. Company Dropdown (hide if targetCompany is not All)
content = content.replace(
  /<select className=\{styles\.filterSelect\} value=\{selectedCompany\} onChange=\{e => setSelectedCompany\(e.target.value\)\}>[\s\S]*?<\/select>/m,
  `{targetCompany === "All" && (
              <select className={styles.filterSelect} value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
                <option value="All">All Companies</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}`
);

// 8. Action column
content = content.replace(/<div className=\{styles\.actionMenuContainer\}>[\s\S]*?<\/div>/m, '');
content = content.replace(/<div className=\{styles\.modalOverlay\} onClick=\{[\s\S]*?<\/div>\s*<\/div>\s*\)\}/m, '');

fs.writeFileSync('src/app/share/payment/page.tsx', content);
