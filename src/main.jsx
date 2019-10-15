import {
  h, 
  render,
  useState,
  useEffect
} from 'fre'

/** @jsx h */

const Poesy = ({ poesy }) => {
  const { title = 'loading ...', artist, content = '' } = poesy || {};
  const lines = content.split('|^n|');
  return (
    <article>
      <h3>{title}</h3>
      <span>{artist}</span>
      <div>
        {
          lines.map(line => <p>{line}</p>)
        }
      </div>
    </article>
  );
};

const App = () => {
  const [poesies, setPoesies] = useState([]);
  
  const s = Date.now() / 1000;
  const x = s / 60 / 60;
  const d = x / 24;
  const index = (d % poesies.length) | 0;
  const poesy = poesies[index];
  useEffect(() => {
    if(poesy) {
      const { title, artist } = poesy;
      document.title = `${title} - ${artist}`;
    }
    scrollTo({ top: 0, behavior: 'smooth' });
  });

  useEffect(() => {
    fetch('./data/poesy.json')
    .then(response => response.json())
    .then(response => {
      setPoesies(response);
    });
  }, []);
  return (
    <div>
      <Poesy poesy={poesy} />
      <footer>
        &copy; made by <a href="https://lsong.org">lsong</a>,&nbsp;
        <a href="https://github.com/song940/poesy/issues/new">click here</a> to submit
      </footer>
    </div>
  )
};

render(<App />, document.getElementById('app'))