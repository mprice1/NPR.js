src_root = "src/"
outfile = "npr_build.js"
outfile_opt = "npr_build_opt.js"

import os, sys, tempfile

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
  src = concat_sources(get_sources());
  fname = outfile
  if 'release' in sys.argv:
    fname = outfile_opt
    f1, uncompiled_path = tempfile.mkstemp()
    f2, compiled_path = tempfile.mkstemp()
    os.write(f1, src)
    os.close(f1)
    os.close(f2)
    os.system('closure --js %s --js_output_file %s' % (uncompiled_path, compiled_path))
    os.remove(uncompiled_path)
    src = open(compiled_path).read()
    os.remove(compiled_path)
  open(fname, 'w').write(src);

if __name__ == '__main__':
  build()