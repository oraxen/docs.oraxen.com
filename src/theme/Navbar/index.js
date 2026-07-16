export default function Navbar() {
  // Docusaurus' table-of-contents positioning expects a .navbar element.
  // Keep an invisible, zero-height anchor while removing the actual header.
  return <div className="navbar oraxen-navbar-anchor" aria-hidden="true" />;
}
