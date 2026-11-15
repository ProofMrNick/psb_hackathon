
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';

import NewChat from './components/NewChat.jsx';
import Chat from './components/Chat.jsx';
import SplitView from './components/SplitView.jsx';
import NotFound from './components/NotFound.jsx';


function ChatPage() {
    const { chat_id } = useParams();
    return <Chat key={chat_id} />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NewChat />} />
        <Route path="/:chat_id" element={<ChatPage />} />
        <Route path="/:chat_id/:msg_id/:document_id" element={<SplitView />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
} 

export default App;