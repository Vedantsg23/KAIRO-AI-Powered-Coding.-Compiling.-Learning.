from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    """Base for public contracts: snake_case in Python, camelCase in JSON."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    def to_json_dict(self) -> dict:
        return self.model_dump(mode="json", by_alias=True)
