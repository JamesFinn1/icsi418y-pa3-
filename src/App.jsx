import { useEffect, useState } from "react";

// Empty object of our fields
const emptySignup = {
  firstName: "",
  lastName: "",
  username: "",
  password: ""
};

const emptyProject = {
  name: "",
  description: "",
  status: "Planning",
  project_lead_id: "",
};

export default function App() {

  // Array deconstruction with imported function useState
  // Updates Ui elements 
  const [page, setPage] = useState("signup");
  const [signup, setSignup] = useState(emptySignup);
  const [login, setLogin] = useState({ username: "", password: "" });
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  // Added fields
  const [users, setUsers] = useState([]);
  const [project, setProject] = useState(emptyProject);

  const [projects, setProjects] = useState([]);

  const updateProject = (event) => {
    const { name, value } = event.target;
  
    setProject(current => ({
      ...current,
      [name]: value // Dynamic key update
    }));
  };

  // Sets the user array with the active users from table
  async function loadUsers() {
    try {
      // contact backend server
      const response = await fetch("/api/users");
      if (!response.ok) {throw new Error("Failed to load registered users.");}
  
      const data = await response.json();
      setUsers(data);
    } 
    catch (error) {
      setNotice({type: "error",text: error.message,});
    }
  }

  async function loadProjects() {
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) { throw new Error("Failed to load projects."); }

      const data = await response.json();
      setProjects(data);
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } 
}

  useEffect(() => {
    if (page === "projects") {
      loadUsers();
    }
    if (page === "view-projects") {
      loadProjects();
    }
  }, [page]);

  // send the project object to backend server
  async function submitProject(event) {
    event.preventDefault();
    setNotice(null);

    if (!project.name.trim() || !project.description.trim() || !project.project_lead_id) {
      setNotice({type: "error",text: "Please complete all project fields.",});
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/projects", {
      method: "POST",
      headers: {"Content-Type": "application/json",},body: JSON.stringify(project),
    });

    const data = await response.json();
    setNotice({type: response.ok ? "success" : "error", text: data.message || "Project request finished.",});

      if (response.ok) {
        setProject(emptyProject);
      }
    } 
    catch {
      setNotice({type: "error",text: "Could not contact the server.",});
    } 
    finally {
      setBusy(false);
    }
  }

  function changePage(nextPage) {
    setPage(nextPage);
    setNotice(null);
  }

  function updateSignup(event) {
    const { name, value } = event.target;
    setSignup(current => ({ ...current, [name]: value }));
  }

  function updateLogin(event) {
    const { name, value } = event.target;
    setLogin(current => ({ ...current, [name]: value }));
  }

  // Submit button
  async function submitSignup(event) {
    event.preventDefault();
    setNotice(null);

    if (Object.values(signup).some(value => !value.trim())) {
      setNotice({ type: "error", text: "Please fill in every field." });
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup)
      });
      const data = await response.json();
      setNotice({
        type: response.ok ? "success" : "error",
        text: data.message || "Signup request finished."
      });

      if (response.ok) {
        setSignup(emptySignup);
        setLogin(current => ({ ...current, username: signup.username, password: "" }));
      }
    } catch {
      setNotice({
        type: "error",
        text: "Could not contact the server. Make sure the backend is running."
      });
    } finally {
      setBusy(false);
    }
  }

  // Login button
  async function submitLogin(event) {
    event.preventDefault();
    setNotice(null);

    if (!login.username.trim() || !login.password.trim()) {
      setNotice({ type: "error", text: "Please enter both username and password." });
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(login)
      });
      const data = await response.json();
      setNotice({
        type: response.ok ? "success" : "error",
        text: data.message || "Login request finished."
      });
      if (response.ok) setLogin(current => ({ ...current, password: "" }));
    } catch {
      setNotice({
        type: "error",
        text: "Could not contact the server."
      });
    } finally {
      setBusy(false);
    }
  }

  // react/html formating code to be returned for the webpage being used/called in main.jsx
  // each page represents a form that displays diffrent information
  return (
    <main className="page">
      <section className="auth-card">
        <div className="brand-mark" aria-hidden="true">ICSI</div>
        <h1>Welcome</h1>
        <p className="subtitle">Sign up or log in to continue.</p>

        <div className="tabs" role="tablist" aria-label="Authentication">
          <button
            className={page === "signup" ? "tab active" : "tab"}
            onClick={() => changePage("signup")}
            role="tab"
            aria-selected={page === "signup"}
            type="button">
            Sign up
          </button>
          <button
            className={page === "login" ? "tab active" : "tab"}
            onClick={() => changePage("login")}
            role="tab"
            aria-selected={page === "login"}
            type="button">
            Log in
          </button>
          <button
            className={page === "projects" ? "tab active" : "tab"}
            onClick={() => changePage("projects")}
            role="tab"
            aria-selected={page === "projects"}
            type="button">
            Projects
          </button>
          <button
            className={page === "view-projects" ? "tab active" : "tab"}
            onClick={() => changePage("view-projects")}
            role="tab"
            aria-selected={page === "view-projects"}
            type="button">
            View Projects
          </button>
          <button
            className={page === "manage-projects" ? "tab active" : "tab"}
            onClick={() => changePage("manage-projects")}
            role="tab"
            aria-selected={page === "manage-projects"}
            type="button">
            Manage Product Memberships
          </button>

        </div>

        {notice && (
          <div className={`notice ${notice.type}`} role="status">
            {notice.text}
          </div>
        )}

        {page === "signup" ? (
          <form onSubmit={submitSignup}>
            <div className="name-row">
              <label>
                First name
                <input name="firstName" value={signup.firstName}
                  onChange={updateSignup} 
                  placeholder="First Name"/>
              </label>
              <label>
                Last name
                <input name="lastName" value={signup.lastName}
                  onChange={updateSignup} 
                  placeholder="Last Name"/>
              </label>
            </div>
            <label>
              Username
              <input name="username" value={signup.username}
                onChange={updateSignup} placeholder="Choose a username"
                autoComplete="username" maxLength="50" />
            </label>
            <label>
              Password
              <input name="password" type="password" value={signup.password}
                onChange={updateSignup} placeholder="At least 8 characters"
                autoComplete="new-password" />
            </label>
            <button className="submit" type="submit" disabled={busy}>
              {busy ? "Creating account..." : "Create account"}
            </button>
          </form>
        ) : page === "login" ? (
          <form onSubmit={submitLogin}>
            <label>
              Username
              <input name="username" value={login.username}
                onChange={updateLogin} placeholder="Your username"
                autoComplete="username" />
            </label>
            <label>
              Password
              <input name="password" type="password" value={login.password}
                onChange={updateLogin} placeholder="Your password"
                autoComplete="current-password" />
            </label>
            <button className="submit" type="submit" disabled={busy}>
              {busy ? "Logging in..." : "Log in"}
            </button>
          </form>
        ): page === "projects" ? (
          <form onSubmit={submitProject}>
          <h2>Create Project</h2>
          <p className="subtitle">
          Add a new software project.
          </p>

          <label>
          Project Name
          <input name="name" value={project.name} onChange={updateProject} placeholder="Enter project name"
          maxLength={100}
          required/>
          </label>

          <label>
          Description
          <textarea name="description" value={project.description} onChange={updateProject} placeholder="Describe the project"
          required/>
          </label>

          <label>
          Status
          <select name="status" value={project.status} onChange={updateProject} required>
            <option value="Planning">Planning</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
          </label>

          <label>
          Project Lead
          <select name="project_lead_id" value={project.project_lead_id} onChange={updateProject} required>
          <option value="">Select a project lead</option>

          {users.map((user) => (
            <option key={user._id} value={user._id}>
            {user.f_name} {user.l_name} ({user.username})
            </option>
          ))}
          </select>
          </label>

          <button className="submit" type="submit" disabled={busy}>
            {busy ? "Creating project..." : "Create Project"}
          </button>
          </form>
          
        ): (
          <div className="project-list">
            <h2>Projects</h2>

            {projects.length === 0 ? (
              <p className="subtitle">No projects have been created yet.</p>
            ) : (
              projects.map((p) => (
                <article className="project-card" key={p._id}>
                  <h3>{p.name}</h3>
                  <p><strong>Description:</strong> {p.description}</p>
                  <p><strong>Status:</strong> {p.status}</p>
                  <p>
                    <strong>Project Lead:</strong> {p.lead_name}
                    {p.lead_username && ` (${p.lead_username})`}
                  </p>
                </article>
              ))
            )}
          </div>
          ) // end of view-projects
        }

        {(page === "signup" || page === "login") && (
        <p className="footnote">
          {page === "signup" ? "Already have an account?" : "New here?"}{" "}
          <button className="text-button" type="button"
            onClick={() => changePage(page === "signup" ? "login" : "signup")}>
            {page === "signup" ? "Log in" : "Create an account"}
          </button>
        </p>
        )}

      </section>
      <p className="page-footer">ICSI 418Y· Assignment 3</p>
    </main>
  );
}