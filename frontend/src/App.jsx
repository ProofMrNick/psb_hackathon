
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import NewChat from './components/Chat.jsx';
import Chat from './components/Chat.jsx';
import Chat from './components/SplitView.jsx';
import NotFound from './components/NotFound.jsx';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NewChat />} />
        <Route path="/:chat_id" element={<Chat />} />
        <Route path="/:chat_id/:msg_id/:document_id" element={<SplitView />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
} 

export default App;