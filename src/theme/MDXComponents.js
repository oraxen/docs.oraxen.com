import MDXComponents from '@theme-original/MDXComponents';
import Highlight from '@site/src/components/Highlight';
import PluginFileTree from '@site/src/components/PluginFileTree';
import Ping from '@site/src/components/Ping';

export default {...MDXComponents, Highlight, PluginFileTree, ping: Ping};
