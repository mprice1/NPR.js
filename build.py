src_root = "src/"
outfile = "npr_build.js"

import os

def get_sources():
  srcs = []
  for (path, dirs, files) in os.walk(src_root):
    for file in files:
      norm_path = os.path.normpath(os.path.join(path, file))
      if os.path.splitext(norm_path)[1] == ".js":
      	srcs.append(norm_path)
  return srcs

def concat_sources(srcs):
  concat = ""
  for src in srcs:
    concat += "//////////////////////////////////////\n"
    concat += "// " + src + "\n"
    concat += "//////////////////////////////////////\n"
    concat += open(src, 'r').read()
    concat += "\n"
  return concat

def build():
  open(outfile, 'w').write(concat_sources(get_sources()));

if __name__ == '__main__':
  build()