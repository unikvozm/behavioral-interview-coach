import { NavLink, Route, Routes } from "react-router-dom";
import QuestionListPage from "./pages/QuestionListPage";
import PracticePage from "./pages/PracticePage";
import ContributePage from "./pages/ContributePage";

export default function App() {
  return (
    <div className="app-shell">
      <nav className="top-nav">
        <span className="brand">Behavioral Interview Coach</span>
        <div className="nav-links">
          <NavLink to="/" end>
            Questions
          </NavLink>
          <NavLink to="/contribute">Contribute a question</NavLink>
        </div>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<QuestionListPage />} />
          <Route path="/practice/:id" element={<PracticePage />} />
          <Route path="/contribute" element={<ContributePage />} />
        </Routes>
      </main>
    </div>
  );
}
