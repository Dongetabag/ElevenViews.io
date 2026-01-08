import React, { useState, useRef, useEffect } from 'react';
import {
  Users, MessageCircle, FileText, Send, Paperclip, Search,
  MoreHorizontal, Phone, Video, Hash, Plus, Upload, Download,
  Image, File, X, Check, Circle, UserPlus, Settings, Bell,
  Smile, AtSign, ChevronRight, FolderOpen, Trash2, Eye
} from 'lucide-react';
import { useTeam, useMessages, useDocuments, useCurrentUser, useChannels } from '../hooks/useAppStore';
import { User, Message, Document, Channel } from '../services/appStore';

const TeamModule: React.FC = () => {
  const { users, onlineCount } = useTeam();
  const { user: currentUser } = useCurrentUser();
  const { channels } = useChannels();
  const { documents, uploadDocument, deleteDocument } = useDocuments();

  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'files'>('chat');
  const [selectedChannel, setSelectedChannel] = useState<string>('general');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <div className="flex h-full animate-fadeIn overflow-hidden bg-[#050505]">
      {/* Left Sidebar - Channels & DMs */}
      <div className="w-64 border-r border-white/5 flex flex-col bg-black/40">
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Team Hub</h2>
          <p className="text-xs text-gray-500">{onlineCount} of {users.length} online</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {[
            { id: 'chat', label: 'Chat', icon: <MessageCircle className="w-4 h-4" /> },
            { id: 'members', label: 'Team', icon: <Users className="w-4 h-4" /> },
            { id: 'files', label: 'Files', icon: <FileText className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 p-3 flex items-center justify-center gap-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-brand-gold border-b-2 border-brand-gold bg-brand-gold/5'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content based on tab */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'chat' && (
            <div className="p-2 space-y-4">
              {/* Channels */}
              <div>
                <div className="px-2 py-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Channels</span>
                  <button className="text-gray-500 hover:text-brand-gold">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                {channels.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => { setSelectedChannel(channel.id); setSelectedUser(null); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedChannel === channel.id && !selectedUser
                        ? 'bg-brand-gold/10 text-brand-gold'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Hash className="w-4 h-4" />
                    <span className="text-sm">{channel.name}</span>
                  </button>
                ))}
              </div>

              {/* Direct Messages */}
              <div>
                <div className="px-2 py-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Direct Messages</span>
                </div>
                {users.filter(u => u.id !== currentUser?.id).map(user => (
                  <button
                    key={user.id}
                    onClick={() => { setSelectedUser(user); setSelectedChannel(''); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedUser?.id === user.id
                        ? 'bg-brand-gold/10 text-brand-gold'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                        alt={user.name}
                        className="w-8 h-8 rounded-lg"
                      />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a0a] ${
                        user.status === 'online' ? 'bg-green-500' :
                        user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{user.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{user.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="p-4 space-y-3">
              {users.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="relative">
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                      alt={user.name}
                      className="w-10 h-10 rounded-xl"
                    />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a0a] ${
                      user.status === 'online' ? 'bg-green-500' :
                      user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-gray-500">{user.role || user.department}</p>
                  </div>
                  {user.id !== currentUser?.id && (
                    <button
                      onClick={() => { setSelectedUser(user); setActiveTab('chat'); }}
                      className="p-2 text-gray-500 hover:text-brand-gold rounded-lg hover:bg-white/5"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {users.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No team members yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div className="p-4 space-y-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-white/20 rounded-xl text-gray-400 hover:text-brand-gold hover:border-brand-gold/50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm">Upload File</span>
              </button>
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-brand-gold/10">
                    {doc.type === 'image' ? <Image className="w-4 h-4 text-brand-gold" /> :
                     doc.type === 'pdf' ? <FileText className="w-4 h-4 text-red-400" /> :
                     <File className="w-4 h-4 text-brand-gold" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{doc.name}</p>
                    <p className="text-[10px] text-gray-500">
                      {doc.uploadedByName} • {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No files shared yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'chat' ? (
          <ChatArea
            channelId={selectedChannel}
            recipient={selectedUser}
            currentUser={currentUser}
          />
        ) : activeTab === 'members' ? (
          <MembersPanel users={users} currentUser={currentUser} />
        ) : (
          <FilesPanel
            documents={documents}
            uploadDocument={uploadDocument}
            deleteDocument={deleteDocument}
            currentUser={currentUser}
          />
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={uploadDocument}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

// Chat Area Component
const ChatArea: React.FC<{
  channelId: string;
  recipient: User | null;
  currentUser: User | null;
}> = ({ channelId, recipient, currentUser }) => {
  const { messages, sendMessage } = useMessages({
    channelId: recipient ? undefined : channelId,
    recipientId: recipient?.id
  });
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <>
      {/* Header */}
      <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/40">
        <div className="flex items-center gap-3">
          {recipient ? (
            <>
              <img
                src={recipient.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${recipient.name}`}
                alt={recipient.name}
                className="w-10 h-10 rounded-xl"
              />
              <div>
                <h3 className="text-sm font-bold text-white">{recipient.name}</h3>
                <p className="text-[10px] text-gray-500">{recipient.status === 'online' ? 'Online' : 'Offline'}</p>
              </div>
            </>
          ) : (
            <>
              <div className="p-2 rounded-xl bg-brand-gold/10">
                <Hash className="w-5 h-5 text-brand-gold" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white capitalize">{channelId}</h3>
                <p className="text-[10px] text-gray-500">Team channel</p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {recipient && (
            <>
              <button className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5">
                <Phone className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5">
                <Video className="w-4 h-4" />
              </button>
            </>
          )}
          <button className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">
                {recipient ? `Start chatting with ${recipient.name}` : `Welcome to #${channelId}`}
              </h3>
              <p className="text-sm text-gray-500">
                {recipient ? 'Send a message to begin the conversation' : 'This is the beginning of the channel'}
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOwn = msg.senderId === currentUser?.id;
            const showAvatar = i === 0 || messages[i - 1]?.senderId !== msg.senderId;
            return (
              <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                {showAvatar ? (
                  <img
                    src={msg.senderAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.senderName}`}
                    alt={msg.senderName}
                    className="w-8 h-8 rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 flex-shrink-0" />
                )}
                <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                  {showAvatar && (
                    <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-medium text-white">{msg.senderName}</span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  <div className={`inline-block p-3 rounded-2xl text-sm ${
                    isOwn
                      ? 'bg-brand-gold text-black rounded-tr-sm'
                      : 'bg-white/10 text-white rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5 bg-black/40">
        <div className="flex items-center gap-3 bg-white/5 rounded-xl p-2">
          <button className="p-2 text-gray-500 hover:text-brand-gold">
            <Plus className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Message ${recipient?.name || '#' + channelId}...`}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
          />
          <button className="p-2 text-gray-500 hover:text-brand-gold">
            <Smile className="w-5 h-5" />
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 bg-brand-gold text-black rounded-lg hover:bg-brand-gold/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};

// Members Panel Component
const MembersPanel: React.FC<{ users: User[]; currentUser: User | null }> = ({ users, currentUser }) => {
  const online = users.filter(u => u.status === 'online');
  const offline = users.filter(u => u.status !== 'online');

  return (
    <div className="p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Team Directory</h2>
            <p className="text-sm text-gray-500">{users.length} members • {online.length} online</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-black font-medium rounded-xl hover:bg-brand-gold/90">
            <UserPlus className="w-4 h-4" />
            Invite
          </button>
        </div>

        {/* Online Members */}
        {online.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Online — {online.length}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {online.map(user => (
                <MemberCard key={user.id} user={user} isCurrentUser={user.id === currentUser?.id} />
              ))}
            </div>
          </div>
        )}

        {/* Offline Members */}
        {offline.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Offline — {offline.length}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offline.map(user => (
                <MemberCard key={user.id} user={user} isCurrentUser={user.id === currentUser?.id} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MemberCard: React.FC<{ user: User; isCurrentUser: boolean }> = ({ user, isCurrentUser }) => (
  <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
    <div className="relative">
      <img
        src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
        alt={user.name}
        className="w-14 h-14 rounded-xl"
      />
      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0a0a] ${
        user.status === 'online' ? 'bg-green-500' :
        user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
      }`} />
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-bold text-white">{user.name}</h4>
        {isCurrentUser && (
          <span className="text-[10px] px-2 py-0.5 bg-brand-gold/20 text-brand-gold rounded-full">You</span>
        )}
      </div>
      <p className="text-xs text-gray-500">{user.role || user.title || 'Team Member'}</p>
      {user.agencyCoreCompetency && (
        <p className="text-[10px] text-gray-600 mt-1">{user.agencyCoreCompetency}</p>
      )}
    </div>
    <div className="text-[10px] text-gray-500">
      Joined {new Date(user.joinedAt).toLocaleDateString()}
    </div>
  </div>
);

// Files Panel Component
const FilesPanel: React.FC<{
  documents: Document[];
  uploadDocument: any;
  deleteDocument: any;
  currentUser: User | null;
}> = ({ documents, uploadDocument, deleteDocument, currentUser }) => {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Shared Files</h2>
            <p className="text-sm text-gray-500">{documents.length} files shared</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-black font-medium rounded-xl hover:bg-brand-gold/90"
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="w-20 h-20 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No files yet</h3>
            <p className="text-sm text-gray-500 mb-6">Upload files to share with your team</p>
            <button
              onClick={() => setShowUpload(true)}
              className="px-6 py-3 bg-brand-gold text-black font-medium rounded-xl"
            >
              Upload First File
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(doc => (
              <div key={doc.id} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 rounded-xl bg-brand-gold/10">
                    {doc.type === 'image' ? <Image className="w-6 h-6 text-brand-gold" /> :
                     doc.type === 'pdf' ? <FileText className="w-6 h-6 text-red-400" /> :
                     <File className="w-6 h-6 text-brand-gold" />}
                  </div>
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="text-sm font-medium text-white truncate mb-1">{doc.name}</h4>
                <p className="text-[10px] text-gray-500">
                  {doc.uploadedByName} • {new Date(doc.createdAt).toLocaleDateString()}
                </p>
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {doc.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 bg-white/10 text-gray-400 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={uploadDocument}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

// Upload Modal
const UploadModal: React.FC<{
  onClose: () => void;
  onUpload: any;
  currentUser: User | null;
}> = ({ onClose, onUpload, currentUser }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'pdf' | 'doc' | 'image' | 'other'>('doc');
  const [tags, setTags] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentUser) return;

    onUpload({
      name,
      type,
      size: Math.floor(Math.random() * 5000000),
      sharedWith: [],
      tags: tags.split(',').map(t => t.trim()).filter(Boolean)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">Upload File</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">File Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
              placeholder="Document name..."
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
            >
              <option value="doc">Document</option>
              <option value="pdf">PDF</option>
              <option value="image">Image</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
              placeholder="client, proposal, 2024..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 text-white rounded-lg hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-brand-gold text-black font-bold rounded-lg hover:bg-brand-gold/90"
            >
              Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamModule;
