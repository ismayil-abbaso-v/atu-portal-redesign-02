-- Prompt 3 advisor remediation: cover the new result-integration foreign keys.
create index if not exists exam_detailed_results_group_id_idx
  on public.exam_detailed_results (group_id)
  where group_id is not null;

create index if not exists exam_detailed_results_source_material_id_idx
  on public.exam_detailed_results (source_material_id)
  where source_material_id is not null;
