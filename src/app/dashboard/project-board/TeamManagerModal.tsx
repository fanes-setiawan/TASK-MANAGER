import React, { useState, useEffect } from 'react';
import { 
  ProjectData, 
  UserProfile, 
  getAllUsers, 
  addTeamMember, 
  removeTeamMember, 
  addNotification 
} from '@/lib/firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import styles from './project-board.module.css';

interface TeamManagerModalProps {
  project: ProjectData;
  currentUserUid: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function TeamManagerModal({ project, currentUserUid, onClose, onRefresh }: TeamManagerModalProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<{ [uid: string]: UserProfile }>({});
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

  // Periksa apakah currentUser adalah pembuat (Owner)
  const isOwner = project.createdBy === currentUserUid;

  useEffect(() => {
    async function loadProfiles() {
      if (!project.members) {
        setIsLoadingProfiles(false);
        return;
      }
      
      setIsLoadingProfiles(true);
      const profiles: { [uid: string]: UserProfile } = {};
      
      for (const m of project.members) {
        try {
          const userSnap = await getDoc(doc(db, "users", m.userId));
          if (userSnap.exists()) {
            profiles[m.userId] = userSnap.data() as UserProfile;
          }
        } catch (e) {
          console.error("Failed to load user profile", e);
        }
      }
      
      setMemberProfiles(profiles);
      setIsLoadingProfiles(false);
      
      // Also fetch all users for the dropdown
      try {
        const users = await getAllUsers();
        setAllUsers(users);
      } catch (err) {
        console.error("Failed to fetch all users", err);
      }
    }
    
    loadProfiles();
  }, [project.members]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    
    setIsAdding(true);
    setSearchMessage('');
    
    try {
      const targetUser = allUsers.find(u => u.uid === selectedUserId);
      
      if (!targetUser) {
        setSearchMessage("User not found.");
        setIsAdding(false);
        return;
      }
      
      // Check if already a member
      if (project.memberIds?.includes(targetUser.uid) || project.createdBy === targetUser.uid) {
        setSearchMessage("User is already a member of this project.");
        setIsAdding(false);
        return;
      }
      
      // Add member to firestore
      await addTeamMember(project.id!, targetUser.uid, "editor");
      
      // Send notification (Wrapped in try/catch because of Firestore security rules)
      try {
        await addNotification(
          targetUser.uid, 
          "Project Invitation", 
          `You have been added to project: ${project.projectName} by a team member.`
        );
      } catch (notifErr) {
        console.warn("Failed to send notification (likely permission denied), but member was added successfully.", notifErr);
      }
      
      setSearchMessage(`Success! ${targetUser.displayName || targetUser.email} has been added.`);
      setSelectedUserId('');
      
      // Trigger refresh
      onRefresh();
      
    } catch (err: any) {
      console.error("Add member error:", err);
      setSearchMessage(`Error: ${err.message || "An error occurred while adding the member."}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string, memberObj: any) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    
    try {
      await removeTeamMember(project.id!, userId, memberObj);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert("Failed to remove member.");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.shareModal} 
        style={{ maxWidth: 500, margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }} 
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0 }}>Team Management</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div>
          
          {isOwner && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ marginBottom: 12, fontSize: 14 }}>Invite New Member</h4>
              <form onSubmit={handleAddMember} style={{ display: 'flex', gap: 8 }}>
                <select 
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--color-outline)', borderRadius: 6, backgroundColor: 'var(--color-surface)', fontFamily: 'inherit' }}
                  required
                >
                  <option value="" disabled>Select a user to add...</option>
                  {allUsers.filter(u => u.uid !== project.createdBy && !project.memberIds?.includes(u.uid)).length === 0 ? (
                    <option value="" disabled>No other registered users available</option>
                  ) : (
                    allUsers
                      .filter(u => u.uid !== project.createdBy && !project.memberIds?.includes(u.uid))
                      .map(u => (
                        <option key={u.uid} value={u.uid}>
                          {u.displayName || u.email} {u.displayName ? `(${u.email})` : ''}
                        </option>
                      ))
                  )}
                </select>
                <button 
                  type="submit" 
                  disabled={isAdding || !selectedUserId}
                  style={{ 
                    padding: '8px 16px', 
                    background: 'var(--color-primary)', 
                    color: 'var(--color-on-primary)', 
                    border: 'none', 
                    borderRadius: 6,
                    cursor: isAdding || !selectedUserId ? 'not-allowed' : 'pointer',
                    opacity: isAdding || !selectedUserId ? 0.7 : 1
                  }}
                >
                  {isAdding ? 'Adding...' : 'Add'}
                </button>
              </form>
              {searchMessage && (
                <p style={{ marginTop: 8, fontSize: 12, color: searchMessage.includes('Success') ? 'green' : 'var(--color-error)' }}>
                  {searchMessage}
                </p>
              )}
            </div>
          )}

          <div>
            <h4 style={{ marginBottom: 12, fontSize: 14 }}>Current Members</h4>
            
            {isLoadingProfiles ? (
              <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>Loading members...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                {/* Project Owner */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid var(--color-outline)', borderRadius: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary)', color: 'var(--color-on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {project.createdBy?.substring(0, 2).toUpperCase() || "OW"}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>Project Owner</div>
                      <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Creator</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, padding: '4px 8px', background: 'var(--color-surface-container-low)', borderRadius: 4 }}>Owner</span>
                </div>

                {/* Added Members */}
                {project.members?.map((member, i) => {
                  const profile = memberProfiles[member.userId];
                  
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid var(--color-outline)', borderRadius: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {profile?.avatarUrl ? (
                          <img src={profile.avatarUrl} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#64748b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12 }}>
                            {profile?.displayName?.substring(0, 2).toUpperCase() || member.userId.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{profile?.displayName || "Unknown User"}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>{profile?.email || member.userId}</div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, padding: '4px 8px', background: 'var(--color-surface-container-low)', borderRadius: 4, textTransform: 'capitalize' }}>
                          {member.role}
                        </span>
                        
                        {isOwner && (
                          <button 
                            onClick={() => handleRemoveMember(member.userId, member)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', display: 'flex' }}
                            title="Remove member"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {(!project.members || project.members.length === 0) && (
                  <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>No additional team members.</p>
                )}
                
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
